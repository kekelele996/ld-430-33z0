import { AssetType } from '../types/enums';

const allowedFormats: Record<AssetType, string[]> = {
  [AssetType.Image]: ['PNG', 'JPG', 'JPEG', 'WEBP'],
  [AssetType.Vector]: ['SVG', 'AI', 'EPS'],
  [AssetType.Font]: ['OTF', 'TTF', 'WOFF'],
  [AssetType.Template]: ['PSD', 'FIG', 'SKETCH'],
  [AssetType.Video]: ['MP4', 'MOV'],
  [AssetType.Audio]: ['MP3', 'WAV'],
  [AssetType.ThreeDModel]: ['OBJ', 'FBX', 'GLB'],
};

export const validateFileFormat = (assetType: AssetType, format: string) =>
  allowedFormats[assetType]?.includes(format.toUpperCase()) ?? false;
