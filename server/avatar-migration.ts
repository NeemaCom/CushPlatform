import { storage } from "./storage";
import { AvatarService } from "./avatarService";

/**
 * Migration script to generate avatars for existing users
 */
export async function migrateExistingUsersAvatars() {
  console.log('Starting avatar migration for existing users...');
  
  try {
    const avatarService = new AvatarService(storage);
    
    // Get all users without profile pictures
    const users = await storage.getAllUsers();
    const usersWithoutAvatars = users.filter(user => !user.profilePicture);
    
    console.log(`Found ${usersWithoutAvatars.length} users without avatars`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithoutAvatars) {
      try {
        await avatarService.ensureUserHasAvatar(user.id);
        processedCount++;
        console.log(`✓ Generated avatar for user: ${user.firstName} ${user.lastName} (${user.email})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to generate avatar for user ${user.id}:`, error);
      }
    }
    
    console.log(`Avatar migration completed:`);
    console.log(`- Successfully processed: ${processedCount} users`);
    console.log(`- Errors: ${errorCount} users`);
    
  } catch (error) {
    console.error('Avatar migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingUsersAvatars()
    .then(() => {
      console.log('Avatar migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Avatar migration failed:', error);
      process.exit(1);
    });
}