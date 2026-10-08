export const NICKNAME_MAX_LENGTH = 40
export const MESSAGE_MAX_LENGTH = 2000

export function validateBirthdayMessage(input = {}) {
  const { nickname, message } = input ?? {}
  const values = {
    nickname: typeof nickname === 'string' ? nickname.trim() : '',
    message: typeof message === 'string' ? message.trim() : '',
  }
  const errors = {}
  if (!values.nickname) errors.nickname = 'Please add a nickname so Ayesa knows who this is from.'
  else if (values.nickname.length > NICKNAME_MAX_LENGTH) errors.nickname = 'Keep your nickname to 40 characters or fewer.'
  if (!values.message) errors.message = 'Write a little message for Ayesa first.'
  else if (values.message.length > MESSAGE_MAX_LENGTH) errors.message = 'Keep your message to 2,000 characters or fewer.'
  return { values, errors }
}
