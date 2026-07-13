import { parseCorsOrigins } from './configuration';

describe('parseCorsOrigins', () => {
  it('defaults to local web when unset', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:3000']);
  });

  it('trims whitespace around comma-separated entries', () => {
    // Pasting a list into a dashboard field naturally produces ", " separators.
    expect(
      parseCorsOrigins('https://www.friendsofamstel.rw, https://friendsofamstel.rw'),
    ).toEqual(['https://www.friendsofamstel.rw', 'https://friendsofamstel.rw']);
  });

  it('strips trailing slashes so entries match the browser Origin header', () => {
    expect(parseCorsOrigins('https://www.friendsofamstel.rw/')).toEqual([
      'https://www.friendsofamstel.rw',
    ]);
  });

  it('drops empty entries from trailing or doubled commas', () => {
    expect(parseCorsOrigins('https://a.rw,,https://b.rw,')).toEqual([
      'https://a.rw',
      'https://b.rw',
    ]);
  });
});
