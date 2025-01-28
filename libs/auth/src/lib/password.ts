import { encodeHexLowerCase } from '@oslojs/encoding';
import { sha1 } from '@oslojs/crypto/sha1';
import axios from 'axios';
import { hash, verify } from '@node-rs/argon2';

export const haveIbeenPawned = async (password: string) => {
  const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);
  const response = await axios.get(
    `https://api.pwnedpasswords.com/range/${hashPrefix}`
  );
  const data = await response.data.toString();
  const items = data.split('\n');
  for (const item of items) {
    const hashSuffix = item.slice(0, 35).toLowerCase();
    if (hash === hashPrefix + hashSuffix) {
      return false;
    }
  }
  return true;
};

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPasswordHash(
  hash: string,
  password: string
): Promise<boolean> {
  return await verify(hash, password);
}
