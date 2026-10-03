import clientProfile from './client-profile.json'

// Booking happens by phone (call or text). Every booking link is built from here.
const e164 = `+1${clientProfile.phoneNumber.replace(/\D/g, '')}`

export const booking = {
  phoneDisplay: clientProfile.phoneNumber,
  telHref: `tel:${e164}`,
  smsHref: `sms:${e164}`,
  hours: 'Mon–Thu 10–8, Fri 10–5',
} as const
