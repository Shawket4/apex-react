import { describe, expect, it } from 'vitest';
import { userCreateSchema, userSchema, userUpdateSchema } from './schemas';

describe('user schemas', () => {
  it('accepts the edit form as it is submitted: permission from the Select, no id yet', () => {
    const parsed = userUpdateSchema.parse({
      name: 'Admin',
      email: 'a@b.co',
      phone: '',
      permission: '4',
      password: '',
    });
    expect(parsed.permission).toBe(4);
  });

  it('rejects a permission outside the 1–4 ladder', () => {
    expect(userUpdateSchema.safeParse({ permission: '7' }).success).toBe(false);
  });

  it('keeps the create payload permission a string, as RegisterUser reads it', () => {
    const parsed = userCreateSchema.parse({
      name: 'New',
      email: 'n@b.co',
      permission: '2',
      password: 'secret1',
    });
    expect(parsed.permission).toBe('2');
  });

  it('reads the lowercase id FalconGo sends', () => {
    expect(userSchema.parse({ id: 3, email: 'x@y.co', permission: 4 }).id).toBe(3);
  });
});
