export const DATE_FORMATS = {
  short: 'dd/MM/yyyy',
  long: 'dd MMMM yyyy',
  datetime: 'dd/MM/yyyy HH:mm',
  datetimeLong: 'dd MMMM yyyy HH:mm',
  time: 'HH:mm',
  iso: 'yyyy-MM-dd',
  isoDateTime: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

export type DateFormat = keyof typeof DATE_FORMATS;
