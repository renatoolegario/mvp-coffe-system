import { Box, Typography } from "@mui/material";

const PageHeader = ({ title, subtitle, action }) => (
  <Box mb={3} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body1" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </Box>
    {action}
  </Box>
);

export default PageHeader;
