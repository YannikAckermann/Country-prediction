import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        swisscom: {
          red: '#ff0000',
          blue: '#001155',
          black: '#000000',
          white: '#ffffff',
          gray: '#f2f2f2'
        }
      }
    },
  },
  plugins: [],
};
export default config;
