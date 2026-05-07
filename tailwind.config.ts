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
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 50, 122, 0.04), 0 4px 12px rgba(17, 50, 122, 0.06)",
        "card-hover": "0 2px 4px rgba(17, 50, 122, 0.06), 0 8px 24px rgba(17, 50, 122, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
