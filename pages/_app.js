import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { useEffect } from "react";
import { useDataStore } from "../hooks/useDataStore";

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
  const loadData = useDataStore((state) => state.loadData);
  const hydrated = useDataStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) {
      loadData();
    }
  }, [hydrated, loadData]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
};

export default App;
