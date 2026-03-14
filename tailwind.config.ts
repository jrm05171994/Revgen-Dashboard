import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#11327A",
        teal: "#34B3D4",
        "teal-light": "#CCECF4",
        coral: "#EE8363",
        green: "#4BAC64",
        gray: "#5D6265",
      },
      fontFamily: {
        sans: ["Montserrat", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
