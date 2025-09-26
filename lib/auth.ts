
import { userQueries } from './db';

export async function isAdminUser(username: string): Promise<boolean> {
  try {
    const user = await userQueries.getUserByUsername(username);
    return user?.role === 'admin';
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
}