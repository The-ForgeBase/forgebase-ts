import { realTime } from './real-time';

describe('realTime', () => {
  it('should work', () => {
    expect(realTime()).toEqual('real-time');
  });
});
