import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';
import { NoteReaction } from '../../notes/entities/note-reaction.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { Review } from '../../reviews/entities/review.entity';
import { ReviewLike } from '../../reviews/entities/review-like.entity';
import { Bookmark } from '../../bookmarks/entities/bookmark.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { PendingUser } from '../../auth/entities/pending-user.entity';
import { Session } from '../../auth/entities/session.entity';
import { Setting } from '../../admin/entities/setting.entity';
import { UserRepository } from './user.repository';
import { NoteRepository } from './note.repository';
import { ResourceRepository } from './resource.repository';
import { ReviewRepository } from './review.repository';
import { ReviewLikeRepository } from './review-like.repository';
import { BookmarkRepository } from './bookmark.repository';
import { NotificationRepository } from './notification.repository';
import { PendingUserRepository } from './pending-user.repository';
import { SessionRepository } from './session.repository';
import { SettingRepository } from './setting.repository';
import { NoteReactionRepository } from './note-reaction.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, Note, NoteReaction, Resource, Review, ReviewLike,
      Bookmark, Notification, PendingUser, Session, Setting,
    ]),
  ],
  providers: [
    UserRepository, NoteRepository, ResourceRepository,
    ReviewRepository, ReviewLikeRepository, BookmarkRepository,
    NotificationRepository, PendingUserRepository, SessionRepository,
    SettingRepository, NoteReactionRepository,
  ],
  exports: [
    UserRepository, NoteRepository, ResourceRepository,
    ReviewRepository, ReviewLikeRepository, BookmarkRepository,
    NotificationRepository, PendingUserRepository, SessionRepository,
    SettingRepository, NoteReactionRepository,
  ],
})
export class RepositoriesModule {}
