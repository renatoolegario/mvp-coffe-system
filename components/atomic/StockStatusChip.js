import { Chip } from "@mui/material";
import { getStockStatusColor } from "../../utils/stock";

const StockStatusChip = ({ status, label, size = "small", sx = {} }) => (
  <Chip
    size={size}
    color={getStockStatusColor(status)}
    label={label || "Sem faixa"}
    variant={status ? "filled" : "outlined"}
    sx={sx}
  />
);

export default StockStatusChip;
