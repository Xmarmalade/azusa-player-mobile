export enum PlaylistTypes {
  Typical = 'typical',
  Search = 'search',
  Favorite = 'favorite',
}

export const SearchRegex: { [key: string]: { regex: RegExp; text: string } } = {
  absoluteMatch: { regex: /Parsed:(.+)/, text: 'Parsed:' },
  artistMatch: { regex: /Artist:(.+)/, text: 'Artist:' },
  albumMatch: { regex: /Album:(.+)/, text: 'Album:' },
  cachedMatch: { regex: /Cached:/, text: 'Cached:' },
};

export enum SortOptions {
  TITLE = 'title',
  ARTIST = 'artist',
  ALBUM = 'album',
  DATE = 'date',
  PREVIOUS_ORDER = 'previous',
}
