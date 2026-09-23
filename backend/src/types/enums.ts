export enum AssetType {
  Image = 'Image',
  Vector = 'Vector',
  Font = 'Font',
  Template = 'Template',
  Video = 'Video',
  Audio = 'Audio',
  ThreeDModel = '3DModel',
}

export enum LicenseType {
  Free = 'Free',
  CC0 = 'CC0',
  CC_BY = 'CC_BY',
  CC_BY_SA = 'CC_BY_SA',
  Commercial = 'Commercial',
  Extended = 'Extended',
}

export enum AssetStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
  Flagged = 'Flagged',
}

export enum ReviewResult {
  Approved = 'Approved',
  Rejected = 'Rejected',
  NeedsRevision = 'NeedsRevision',
}

export enum DownloadPurpose {
  Personal = 'Personal',
  Commercial = 'Commercial',
  Editorial = 'Editorial',
}

export enum TagCategory {
  Style = 'Style',
  Color = 'Color',
  Subject = 'Subject',
  Mood = 'Mood',
  Technical = 'Technical',
  Other = 'Other',
}

export enum UserRole {
  Admin = 'Admin',
  Moderator = 'Moderator',
  Uploader = 'Uploader',
  Viewer = 'Viewer',
}
