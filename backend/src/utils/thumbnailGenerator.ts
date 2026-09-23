export const thumbnailFromUrl = (fileUrl: string) => {
  if (fileUrl.includes('?')) return `${fileUrl}&thumb=true`;
  return `${fileUrl}?thumb=true`;
};
