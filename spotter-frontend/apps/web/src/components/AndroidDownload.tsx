import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import AndroidIcon from '@mui/icons-material/AndroidRounded';
import DownloadIcon from '@mui/icons-material/DownloadRounded';

export const ANDROID_APK_URL =
  'https://expo.dev/artifacts/eas/_w_78yy93G5WWHRZDOS4q6bTDjMzxBtpGOqYeuF-UGw.apk';

export function AndroidDownload() {
  return (
    <Box
      component="section"
      id="android-app"
      aria-labelledby="android-app-title"
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        alignItems: { xs: 'stretch', md: 'center' },
        justifyContent: 'space-between',
        p: { xs: 3, md: 4 },
        mb: 3,
        borderRadius: 4,
        bgcolor: '#073C33',
        color: '#FFFEFA',
        scrollMarginTop: '90px',
      }}
    >
      <Box sx={{ maxWidth: 640 }}>
        <Chip
          icon={<AndroidIcon />}
          label="ANDROID PREVIEW"
          size="small"
          sx={{
            bgcolor: '#B8F0DD',
            color: '#073C33',
            mb: 1.5,
            '& .MuiChip-icon': { color: '#073C33' },
          }}
        />
        <Box
          component="h2"
          id="android-app-title"
          sx={{ fontSize: { xs: 26, md: 32 }, m: 0, mb: 1 }}
        >
          Take Waycast on the road.
        </Box>
        <Box component="p" sx={{ m: 0, color: '#E1F1E9', lineHeight: 1.7 }}>
          Plan trips, compare route weather and inspect checkpoints in the native Android app. Live
          planning needs an internet connection. No Expo Go required.
        </Box>
      </Box>
      <Box sx={{ minWidth: { md: 270 }, maxWidth: { md: 330 } }}>
        <Button
          component="a"
          href={ANDROID_APK_URL}
          variant="contained"
          size="large"
          startIcon={<DownloadIcon />}
          fullWidth
          sx={{
            minHeight: 52,
            bgcolor: '#B8F0DD',
            color: '#073C33',
            '&:hover': { bgcolor: '#D8F7EB' },
          }}
        >
          Download Android app
        </Button>
        <Box component="p" sx={{ mt: 1.5, mb: 0, fontSize: 13, lineHeight: 1.6, color: '#E1F1E9' }}>
          APK preview · 109 MiB · Open the downloaded file on Android to install. Your phone may ask
          you to allow installation from your browser. Recheck conditions before departure.
        </Box>
        <Box component="details" sx={{ mt: 1, fontSize: 12, color: '#E1F1E9' }}>
          <summary>Verify download · SHA-256</summary>
          <Box component="code" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>
            73b3ae5b559476928cd94171050a1c91b9159046094168263b703c9bf367ca1c
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
