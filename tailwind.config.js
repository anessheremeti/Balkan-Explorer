/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    // Define all breakpoints explicitly so Tailwind is sure about `xs`
    screens: {
      xs: "400px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        monument: ["Monument-Regular"],
        monumentBold: ["Monument-Ultrabold"],
        clashLight: ["ClashDisplay-Light"],
        clashDisplay: ["ClashDisplay-Regular"],
        nunito: ["Nunito"],
      },
      colors: {
        lightBackground: "#F9F9F9",
        deepGreen: "#216F4C",
        graniteGray: "#676767",
        lightGray: "#E9E9E9",
      },
    },
  },
  plugins: [require("daisyui")],
};