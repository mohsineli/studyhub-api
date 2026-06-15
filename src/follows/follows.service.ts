import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import { UserRepository } from '../common/repositories/user.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { WebsocketService } from '../websocket/websocket.service';

export interface FollowStatus {
  following: boolean;
  followersCount: number;
  followingCount: number;
  isSelf: boolean;
}

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow) private readonly followRepo: Repository<Follow>,
    private readonly userRepository: UserRepository,
    private readonly notificationsService: NotificationsService,
    private readonly websocketService: WebsocketService,
  ) {}

  private countFollowers(userId: number) {
    return this.followRepo.count({ where: { following_id: userId } });
  }

  private countFollowing(userId: number) {
    return this.followRepo.count({ where: { follower_id: userId } });
  }

  private async isFollowing(currentUserId: number, targetUserId: number): Promise<boolean> {
    if (currentUserId === targetUserId) return false;
    const count = await this.followRepo.count({
      where: { follower_id: currentUserId, following_id: targetUserId },
    });
    return count > 0;
  }

  /** Follow status + counts for a target user, from the current user's POV. */
  async getStatus(targetUserId: number, currentUserId: number): Promise<FollowStatus> {
    const [following, followersCount, followingCount] = await Promise.all([
      this.isFollowing(currentUserId, targetUserId),
      this.countFollowers(targetUserId),
      this.countFollowing(targetUserId),
    ]);
    return { following, followersCount, followingCount, isSelf: currentUserId === targetUserId };
  }

  /** Follow a user (idempotent). Notifies the target on a genuinely new follow. */
  async follow(targetUserId: number, currentUserId: number): Promise<{ following: boolean; followersCount: number }> {
    if (targetUserId === currentUserId) {
      throw new BadRequestException("You can't follow yourself");
    }
    const target = await this.userRepository.findById(targetUserId);
    if (!target) throw new NotFoundException('User not found');

    let createdNew = false;
    try {
      await this.followRepo.save(
        this.followRepo.create({ follower_id: currentUserId, following_id: targetUserId }),
      );
      createdNew = true;
    } catch (error: any) {
      // 23505 = unique violation → already following, treat as success
      if (error?.code !== '23505') throw error;
    }

    if (createdNew) {
      this.notifyFollow(currentUserId, targetUserId).catch(() => {});
    }

    const followersCount = await this.countFollowers(targetUserId);
    return { following: true, followersCount };
  }

  /** Unfollow a user (idempotent). */
  async unfollow(targetUserId: number, currentUserId: number): Promise<{ following: boolean; followersCount: number }> {
    await this.followRepo.delete({ follower_id: currentUserId, following_id: targetUserId });
    const followersCount = await this.countFollowers(targetUserId);
    return { following: false, followersCount };
  }

  /** Toggle follow/unfollow (used by the mobile/web button). */
  async toggle(targetUserId: number, currentUserId: number): Promise<{ following: boolean; followersCount: number }> {
    const already = await this.isFollowing(currentUserId, targetUserId);
    return already ? this.unfollow(targetUserId, currentUserId) : this.follow(targetUserId, currentUserId);
  }

  /** Users who follow `userId`. */
  async followers(userId: number, currentUserId: number) {
    const rows = await this.followRepo.find({
      where: { following_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });
    return this.hydrate(rows.map((r) => r.follower_id), currentUserId);
  }

  /** Users that `userId` follows. */
  async following(userId: number, currentUserId: number) {
    const rows = await this.followRepo.find({
      where: { follower_id: userId },
      order: { created_at: 'DESC' },
      take: 100,
    });
    return this.hydrate(rows.map((r) => r.following_id), currentUserId);
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async hydrate(userIds: number[], currentUserId: number) {
    if (userIds.length === 0) return [];
    const users = await this.userRepository.find({ where: { id: In(userIds) } });
    const myFollows = await this.followRepo.find({
      where: { follower_id: currentUserId, following_id: In(userIds) },
    });
    const followingSet = new Set(myFollows.map((f) => f.following_id));
    // preserve original order
    const byId = new Map(users.map((u) => [u.id, u]));
    return userIds
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({
        id: u.id,
        name: u.name,
        profile_pic: u.profile_pic || null,
        dept: u.dept || null,
        isFollowing: u.id === currentUserId ? false : followingSet.has(u.id),
        isSelf: u.id === currentUserId,
      }));
  }

  private async notifyFollow(actorId: number, targetUserId: number) {
    const actor = await this.userRepository.findById(actorId);
    const actorName = actor?.name?.split(' ')[0] || 'Someone';
    const saved = await this.notificationsService.create({
      userId: targetUserId,
      actorId,
      type: NotificationType.FOLLOW,
      title: `${actorName} started following you`,
      entityType: 'user',
      entityId: actorId,
      redirectUrl: `/users/${actorId}`,
      metadata: { actorName, actorAvatar: actor?.profile_pic || null },
    });
    this.websocketService.emitToUser(targetUserId, 'notification:new', saved);
  }
}
