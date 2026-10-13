import Button from '@mui/material/Button';
import AndroidIcon from '@mui/icons-material/AndroidRounded';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import NavigationIcon from '@mui/icons-material/NavigationRounded';

export function WorkspaceHeader() {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-icon">
          <NavigationIcon sx={{ fontSize: 24 }} />
        </span>
        <span>
          waycast<span className="brand-period">.</span>
        </span>
        <span className="workspace-tag">DISPATCH WORKSPACE</span>
      </div>
      <div className="header-right">
        <Button
          component="a"
          href="#android-app"
          variant="contained"
          size="small"
          startIcon={<AndroidIcon />}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Android app
        </Button>
        <Chip
          className="header-status-mui"
          size="small"
          color="success"
          variant="outlined"
          label="Weather-aware routing"
        />
        <Avatar
          className="avatar"
          sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13 }}
        >
          IK
        </Avatar>
      </div>
    </header>
  );
}
