/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Single muted accent; status colors (emerald/amber/rose) stay semantic only.
        brand: {
          300: "#a9c1de",
          400: "#7fa2cc",
          500: "#5a83b8",
          600: "#46699a",
        },
      },
    },
  },
  plugins: [],
};
