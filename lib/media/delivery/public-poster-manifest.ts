import { createMediaDeliveryManifest } from './manifest'

export const PUBLIC_POSTER_MANIFEST = createMediaDeliveryManifest([
  ['arnold-press.webp', '300ca0d1781536a346c926519c113a6e7e54c500667eac6e8905b64dbf1d28ff', 14316],
  ['developpe-militaire-barre-debout.webp', 'dc2b52aeb16e16b9455a2de5f162880c7cd0cd87b26dc0e3aee00bff79aa1e25', 8448],
  ['developpe-militaire-barre.webp', '0a13b452acdf36309131fe36c83e67430aef4ccd63cc475af2dab7a493bd7d60', 8800],
  ['developpe-militaire.webp', 'bbecbffd04e01b40e0941ba7948c8af6790b2db628df61d34e299882c95f1d44', 16704],
  ['elevations-frontales-halteres.webp', '3b43b9e5fe7b3c59e4ec1051c4e0e11b06a198e9dbfc621e503cb4d51a2398b3', 16808],
  ['elevations-laterales-halteres.webp', '4e16c8b18c4035ec5c3bc7dc622d0cce29daea63812bf17258676f3661f5f2f7', 15390],
  ['hack-squat-machine.webp', '8cea91df307aa119d7db5c7d3079082f97d7d6288251a569e3ec2bc476267e76', 15724],
  ['hip-thrust.webp', '82e1b671afe51aef7d7a83867d03026c8fd9b70ddc3bf3cae91a861a00cae2b0', 9376],
  ['kettlebell-swing.webp', 'f57044f901d7327370a89ccfb97ba0965a1ad8af33919bc4a04a24ca2ff3df09', 12070],
  ['leg-extension.webp', '6cc64fd90c95fd42042c56d249593875f27b2905a7bddec3ae6d0c04beef9dc6', 15980],
  ['leg-press.webp', '4e6d4a8a63c71f1796d3617e58123364ad1f25d3e2045a1cc8e6f7352bdbb4d5', 14874],
  ['pull-over-poulie-haute.webp', '8e5a48654febf0f1f8bbc0a00e049cf1debfe3477771da8ba44dcac45923d08d', 15184],
  ['rowing-barre.webp', '4c003a166fb6db6c3b8a7c4a12bda3cc978449c8c0e321ca39e0b127b6225f33', 14588],
  ['souleve-de-terre-roumain.webp', 'f66519ce9b8769c8710ba1f22cec6b8daf5ff3c464db9b30bf4b9f0233ad2592', 9540],
  ['souleve-de-terre.webp', '7e9fccdddc542199d58b22173e8efb5dbfcd6ebb19b96d4854769cdc4e2c155c', 10930],
  ['squat-barre.webp', '177ef2e43a6d31f32b30ad03ed4b48dfbd082b8b9f677417627c75c56b8eae32', 10556],
  ['tractions-pronation.webp', 'bf639f268aa5fbd75a5baee4803e3cd15b2c1fd27a9ec9c627c7b6495e6ff1ec', 7222],
].map(([filename, sha256, bytes]) => ({
  logicalPath: `images/video-posters/${filename}`,
  sha256: String(sha256),
  bytes: Number(bytes),
  contentType: 'image/webp',
  kind: 'image' as const,
  visibility: 'public-versioned' as const,
})))
