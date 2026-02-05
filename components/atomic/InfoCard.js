import { Card, CardContent, Typography } from "@mui/material";

const InfoCard = ({ title, value, subtitle }) => (
  <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
    <CardContent>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {value}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

export default InfoCard;
