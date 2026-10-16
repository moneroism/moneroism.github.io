/*
 * contact + donate. empty for now.
 * add entries and they show up in the contact window, `cat ~/contact.txt` and `xmr`.
 */

export interface ContactEntry {
  label: string; // "matrix", "email", "xmpp"...
  value: string;
  href?: string;
}

export const contact: ContactEntry[] = [
  // { label: 'email', value: 'me@example.org', href: 'mailto:me@example.org' },
  // { label: 'pgp', value: 'XXXX XXXX XXXX XXXX XXXX  XXXX XXXX XXXX XXXX XXXX' },
];

export const donate: { xmr: string; other: ContactEntry[] } = {
  xmr: '', // TODO: address
  other: [],
};
