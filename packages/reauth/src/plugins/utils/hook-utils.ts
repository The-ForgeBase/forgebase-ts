import { AwilixContainer } from 'awilix';
import {
  AuthInput,
  AuthOutput,
  ReAuthCradle,
  AuthStepHooks,
  HooksType,
} from '../../types';

type HookFunction = (
  data: AuthInput | AuthOutput,
  container: AwilixContainer<ReAuthCradle>,
  error?: Error,
) => Promise<AuthOutput | AuthInput | void>;

export function createHookRegisterer(hooks: AuthStepHooks) {
  return function registerHook(type: HooksType, fn: HookFunction) {
    if (!hooks) {
      hooks = {};
    }

    if (type === 'before') {
      hooks.before = async (input, container) => {
        const result = await fn(input, container, undefined);
        return (result as AuthInput) || input;
      };
    } else if (type === 'after') {
      hooks.after = async (output, container) => {
        const result = (await fn(output, container, undefined)) as AuthOutput;
        return result || output;
      };
    } else if (type === 'onError' && hooks.onError) {
      hooks.onError = async (error, input, container) => {
        await fn(input, container, error);
      };
    }
  };
}
