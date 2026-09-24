/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf4",
          100: "#d6f5e2",
          200: "#afe9ca",
          300: "#7bd6aa",
          400: "#45ba83",
          500: "#229d67",
          600: "#176b45",
          700: "#165b3d",
          800: "#154a34",
          900: "#123d2c"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)"
      }
    }
  },
  plugins: []
};

