import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {},
  styles: {
    global: {
      "path, g": {
        stroke: "currentColor",
        fille: "currentColor",
      },
      body: {
        fontFamily: "monospace",
      },
    },
    fontFamily: "monospace",
  },
});

export default theme;
