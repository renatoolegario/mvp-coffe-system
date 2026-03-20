import "../styles/globals.css";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { useEffect } from "react";
import { useDataStore } from "../hooks/useDataStore";
import { getAuthToken } from "../hooks/useSession";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#F2B705",
      light: "#F5C84C",
      dark: "#C89404",
      contrastText: "#0F241F",
    },
    secondary: {
      main: "#132E28",
      light: "#1F4A3F",
      dark: "#0F241F",
      contrastText: "#F5F7F6",
    },
    background: {
      default: "#0F241F",
      paper: "#132E28",
    },
    text: {
      primary: "#F5F7F6",
      secondary: "#C7D1CE",
    },
    divider: "#2A3F3A",
    success: {
      main: "#4CAF50",
    },
    warning: {
      main: "#E0A800",
    },
    error: {
      main: "#C0392B",
    },
    info: {
      main: "#3FA9F5",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #2A3F3A",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#132E28",
          borderBottom: "1px solid #2A3F3A",
          boxShadow: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0C1E1A",
          borderRight: "1px solid #2A3F3A",
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        root: {
          // Os drawers de formulário usam z-index acima do modal para não ficarem
          // atrás do AppBar. Sem elevar o popover, os menus de select ficam
          // renderizados por baixo do drawer e parecem "não clicáveis".
          zIndex: 1380,
        },
      },
    },
    MuiPopper: {
      styleOverrides: {
        root: {
          zIndex: 1380,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: "#2A3F3A",
        },
        root: {
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#F5C84C",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#F2B705",
          },
        },
      },
    },
  },
});

const App = ({ Component, pageProps }) => {
  const loadData = useDataStore((state) => state.loadData);
  const hydrated = useDataStore((state) => state.hydrated);

  useEffect(() => {
    const token = getAuthToken();
    if (!hydrated && token) {
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
