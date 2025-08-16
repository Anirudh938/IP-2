import UserModel from '../../models/users.model';
import {
  deleteUserByUsername,
  getUserByUsername,
  getUsersList,
  loginUser,
  saveUser,
  updateUser,
} from '../../services/user.service';
import { SafeUser, User, UserCredentials } from '../../types/user';
import { user, safeUser } from '../mockData.models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockingoose = require('mockingoose');

describe('User model', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  describe('saveUser', () => {
    beforeEach(() => {
      mockingoose.resetAll();
    });

    it('should return the saved user', async () => {
      mockingoose(UserModel).toReturn(user, 'create');

      const savedUser = (await saveUser(user)) as SafeUser;

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toEqual(user.username);
      expect(savedUser.dateJoined).toEqual(user.dateJoined);
    });

    it('should throw an error if error when saving to database', async () => {
      jest
        .spyOn(UserModel, 'create')
        .mockRejectedValueOnce(() => new Error('Error saving document'));

      const saveError = await saveUser(user);

      expect('error' in saveError).toBe(true);
    });
  });
});

describe('getUserByUsername', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the matching user', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOne');

    const retrievedUser = (await getUserByUsername(user.username)) as SafeUser;

    expect(retrievedUser.username).toEqual(user.username);
    expect(retrievedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });

  it('should throw an error if there is an error while searching the database', async () => {
    mockingoose(UserModel).toReturn(new Error('Error finding document'), 'findOne');

    const getUserError = await getUserByUsername(user.username);

    expect('error' in getUserError).toBe(true);
  });
});

describe('getUsersList', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the users', async () => {
    mockingoose(UserModel).toReturn([safeUser], 'find');

    const retrievedUsers = (await getUsersList()) as SafeUser[];

    expect(retrievedUsers[0].username).toEqual(safeUser.username);
    expect(retrievedUsers[0].dateJoined).toEqual(safeUser.dateJoined);
  });

  it('should throw an error if no users are found', async () => {
    mockingoose(UserModel).toReturn(null, 'find');
    const getUsersError = await getUsersList();
    expect('error' in getUsersError).toBe(true);
  });

  it('should throw an error if there is a database error while retrieving users', async () => {
    mockingoose(UserModel).toReturn(new Error('Database connection failed'), 'find');
    const getUsersError = await getUsersList();
    expect('error' in getUsersError).toBe(true);
  });

  it('should return users in chronological order (oldest first)', async () => {
    const user1 = { ...safeUser, username: 'user1', dateJoined: new Date('2024-01-01') };
    const user2 = { ...safeUser, username: 'user2', dateJoined: new Date('2024-01-02') };
    mockingoose(UserModel).toReturn([user1, user2], 'find');
    const retrievedUsers = (await getUsersList()) as SafeUser[];
    expect(retrievedUsers).toHaveLength(2);
    expect(retrievedUsers[0].username).toEqual('user1');
    expect(retrievedUsers[1].username).toEqual('user2');
  });

  it('should return empty array when database returns empty result', async () => {
    mockingoose(UserModel).toReturn([], 'find');
    const retrievedUsers = (await getUsersList()) as SafeUser[];
    expect(Array.isArray(retrievedUsers)).toBe(true);
    expect(retrievedUsers).toHaveLength(0);
  });
});

describe('loginUser', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the user if authentication succeeds', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOne');

    const credentials: UserCredentials = {
      username: user.username,
      password: user.password,
    };

    const loggedInUser = (await loginUser(credentials)) as SafeUser;

    expect(loggedInUser.username).toEqual(user.username);
    expect(loggedInUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should return the user if the password fails', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const credentials: UserCredentials = {
      username: user.username,
      password: 'wrongPassword',
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });

  it('should return the user is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOne');

    const credentials: UserCredentials = {
      username: 'wrongUsername',
      password: user.password,
    };

    const loginError = await loginUser(credentials);

    expect('error' in loginError).toBe(true);
  });
});

describe('deleteUserByUsername', () => {
  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the deleted user when deleted succesfully', async () => {
    mockingoose(UserModel).toReturn(safeUser, 'findOneAndDelete');

    const deletedUser = (await deleteUserByUsername(user.username)) as SafeUser;

    expect(deletedUser.username).toEqual(user.username);
    expect(deletedUser.dateJoined).toEqual(user.dateJoined);
  });

  it('should throw an error if the username is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndDelete');

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    mockingoose(UserModel).toReturn(new Error('Error deleting object'), 'findOneAndDelete');

    const deletedError = await deleteUserByUsername(user.username);

    expect('error' in deletedError).toBe(true);
  });
});

describe('updateUser', () => {
  const updatedUser: User = {
    ...user,
    password: 'newPassword',
  };

  const safeUpdatedUser: SafeUser = {
    username: user.username,
    dateJoined: user.dateJoined,
  };

  const updates: Partial<User> = {
    password: 'newPassword',
  };

  beforeEach(() => {
    mockingoose.resetAll();
  });

  it('should return the updated user when updated succesfully', async () => {
    mockingoose(UserModel).toReturn(safeUpdatedUser, 'findOneAndUpdate');

    const result = (await updateUser(user.username, updates)) as SafeUser;

    expect(result.username).toEqual(user.username);
    expect(result.username).toEqual(updatedUser.username);
    expect(result.dateJoined).toEqual(user.dateJoined);
    expect(result.dateJoined).toEqual(updatedUser.dateJoined);
  });

  it('should throw an error if the username is not found', async () => {
    mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should throw an error if a database error while deleting', async () => {
    mockingoose(UserModel).toReturn(new Error('Error updating object'), 'findOneAndUpdate');

    const updatedError = await updateUser(user.username, updates);

    expect('error' in updatedError).toBe(true);
  });

  it('should update the biography if the user is found', async () => {
    const newBio = 'This is a new biography';
    // Make a new partial updates object just for biography
    const biographyUpdates: Partial<User> = { biography: newBio };

    // Mock the DB to return a safe user (i.e., no password in results)
    mockingoose(UserModel).toReturn({ ...safeUpdatedUser, biography: newBio }, 'findOneAndUpdate');

    const result = await updateUser(user.username, biographyUpdates);

    // Check that the result is a SafeUser and the biography got updated
    if ('username' in result) {
      expect(result.biography).toEqual(newBio);
    } else {
      throw new Error('Expected a safe user, got an error object.');
    }
  });

  it('should return an error if biography update fails because user not found', async () => {
    // Simulate user not found
    mockingoose(UserModel).toReturn(null, 'findOneAndUpdate');

    const newBio = 'No user found test';
    const biographyUpdates: Partial<User> = { biography: newBio };
    const updatedError = await updateUser(user.username, biographyUpdates);

    expect('error' in updatedError).toBe(true);
  });

  it('should update biography with multiline text', async () => {
    const multilineBio = 'Line 1\nLine 2\nLine 3\n\nLine 5';
    const biographyUpdates: Partial<User> = { biography: multilineBio };
    mockingoose(UserModel).toReturn(
      { ...safeUpdatedUser, biography: multilineBio },
      'findOneAndUpdate',
    );
    const result = await updateUser(user.username, biographyUpdates);
    if ('username' in result) {
      expect(result.biography).toEqual(multilineBio);
      expect(result.biography).toContain('\n');
    } else {
      throw new Error('Expected a safe user, got an error object.');
    }
  });

  it('should handle biography with only whitespace', async () => {
    const whitespaceBio = '   \t  \n  ';
    const biographyUpdates: Partial<User> = { biography: whitespaceBio };
    mockingoose(UserModel).toReturn(
      { ...safeUpdatedUser, biography: whitespaceBio },
      'findOneAndUpdate',
    );
    const result = await updateUser(user.username, biographyUpdates);
    if ('username' in result) {
      expect(result.biography).toEqual(whitespaceBio);
    } else {
      throw new Error('Expected a safe user, got an error object.');
    }
  });

  it('should return error if database throws error during biography update', async () => {
    const newBio = 'Bio that will cause error';
    const biographyUpdates: Partial<User> = { biography: newBio };
    mockingoose(UserModel).toReturn(new Error('Database connection lost'), 'findOneAndUpdate');
    const updatedError = await updateUser(user.username, biographyUpdates);
    expect('error' in updatedError).toBe(true);
  });
});
