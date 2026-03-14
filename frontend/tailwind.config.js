/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: '1rem',
  			md: '0.75rem',
  			sm: '0.5rem',
  			xl: '1.25rem',
  			'2xl': '1.5rem',
  			'3xl': '2rem',
  		},
  		boxShadow: {
			'neu': '4px 4px 9px hsl(240 10% 2.5% / 0.45), -4px -4px 9px hsl(240 10% 8% / 0.35)',
			'neu-sm': '2px 2px 5px hsl(240 10% 2.5% / 0.42), -2px -2px 5px hsl(240 10% 8% / 0.32)',
			'neu-xs': '1px 1px 3px hsl(240 10% 2.5% / 0.38), -1px -1px 3px hsl(240 10% 8% / 0.28)',
			'neu-inset': 'inset 1px 1px 3px hsl(240 10% 2.5% / 0.38), inset -1px -1px 3px hsl(240 10% 8% / 0.28)',
			'neu-inset-sm': 'inset 1px 1px 2px hsl(240 10% 2.5% / 0.3), inset -1px -1px 2px hsl(240 10% 8% / 0.2)',
			'neu-flat': '0 1px 2px hsl(240 10% 2.5% / 0.35), 0 -1px 1px hsl(240 10% 8% / 0.25)',
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};