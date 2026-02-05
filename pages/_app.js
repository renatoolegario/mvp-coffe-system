import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { useEffect } from "react";
import { ensureIndexedDb } from "../utils/indexedDb";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#6f4e37",
    },
    secondary: {
      main: "#b08968",
    },
    background: {
      default: "#f9f5f1",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
});

const App = ({ Component, pageProps }) => {
  useEffect(() => {
    ensureIndexedDb();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
};

export default App;
