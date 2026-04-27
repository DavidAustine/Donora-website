import { createContext, useContext, useState } from "react";

export const LightTheme = {
  bgDark: "#E6E6E6", surface: "#FFFFFF", text: "#0D0D12", textMuted: "#808080",
  border: "#E8E8E8", primary: "#E8192C", success: "#41C343", warning: "#FF9500",
  danger: "#DA2525", shadow: "#000000", redMuted: "#EAAEAE", blueMuted: "#C4D2ED",
  greenMuted: "#C8F5E0", redMuted2: "#FFE4E6", redPale: "#FFF0F1",
  borderGreen: "#86DB75", borderBlue: "#7A97D6", borderRed: "#CE7373",
  successBg: "#E4FFF0", warningBg: "#FFF3E0", shadowRed: "#e8192c40",
  redMid: "#FFDDE0", blue: "#0A84FF", green: "#00C97A", btn: "#FFFFFF",
  sosBg: "#D95959", altText: "#FFFFFF", altBorder: "rgba(0,0,0,0.07)",
  btnDark: "hsl(0,1%,80%)", warningLight: "hsl(35,100%,70%)", purple: "#5A5A72",
  dark: "hsl(224,69%,86%)", darkText: "#0B183C",
  gradientPrimary: "linear-gradient(135deg,#FFFFFF,#EBC6C6)",
  gradientBlue: "linear-gradient(135deg,#FFFFFF,#C4D1ED)",
  gradientGreen: "linear-gradient(135deg,#FFFFFF,#C8F5E0)",
  gradientCard: "linear-gradient(135deg,#FFFFFF,#E0E0E0)",
  gradientRed: "linear-gradient(135deg,#E8192C,#FF6B6B)",
  gradientRedStrip: "linear-gradient(135deg,#E8192C,#C00018)",
};

export const DarkTheme = {
  bgDark: "#000000", surface: "#1A1A1A", text: "#FFFFFF", textMuted: "#A6A6A6",
  border: "#404040", primary: "#E8192C", success: "#41C343", warning: "#FF9500",
  danger: "#DA2525", shadow: "#000000", redMuted: "#EAAEAE", blueMuted: "#C4D2ED",
  greenMuted: "#C8F5E0", redMuted2: "#FFE4E6", redPale: "#FFF0F1",
  borderGreen: "#318221", borderBlue: "#26427D", borderRed: "#CE7373",
  successBg: "#E4FFF0", warningBg: "#FFDBA3", shadowRed: "#e8192c40",
  redMid: "#FFDDE0", blue: "#0A84FF", green: "#00C97A", btn: "#0D0D0D",
  sosBg: "#D95959", altText: "#0D0D12", altBorder: "rgba(255,255,255,0.07)",
  btnDark: "hsl(0,0%,25%)", warningLight: "hsl(35,100%,70%)", purple: "#5A5A72",
  dark: "hsl(224,69%,86%)", darkText: "#0B183C",
  gradientPrimary: "linear-gradient(135deg,#1A1A1A,#391414)",
  gradientBlue: "linear-gradient(135deg,#1A1A1A,#121F3B)",
  gradientGreen: "linear-gradient(135deg,#1A1A1A,#0A3823)",
  gradientCard: "linear-gradient(135deg,#212121,#0D0D0D)",
  gradientRed: "linear-gradient(135deg,#E8192C,#FF6B6B)",
  gradientRedStrip: "linear-gradient(135deg,#E8192C,#C00018)",
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true);
  const toggle = () => setDark(d => !d);
  const t = dark ? DarkTheme : LightTheme;
  return (
    <ThemeContext.Provider value={{ dark, toggle, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
};
