import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
                research: {
                    primary: '#5D5FEF',
                    secondary: '#A5B4FC',
                    accent: '#7C3AED',
                    node: {
                        background: '#F5F7FF',
                        border: '#818CF8',
                        active: '#4F46E5',
                        completed: '#22C55E',
                        waiting: '#F59E0B',
                        error: '#EF4444'
                    }
                }
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				},
                'pulse-light': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                'fade-in-scale': {
                    '0%': { 
                        opacity: '0',
                        transform: 'scale(0.9)'
                    },
                    '100%': { 
                        opacity: '1',
                        transform: 'scale(1)'
                    }
                },
                'slide-up': {
                    '0%': { 
                        opacity: '0',
                        transform: 'translateY(20px)'
                    },
                    '100%': { 
                        opacity: '1',
                        transform: 'translateY(0)'
                    }
                },
                'reveal-dag': {
                    '0%': {
                        opacity: '0',
                        filter: 'blur(8px)',
                        transform: 'scale(0.95) translateY(10px)'
                    },
                    '60%': {
                        filter: 'blur(4px)',
                    },
                    '100%': {
                        opacity: '1',
                        filter: 'blur(0)',
                        transform: 'scale(1) translateY(0)'
                    }
                },
                'draw-lines': {
                    '0%': {
                        'stroke-dashoffset': '1000'
                    },
                    '100%': {
                        'stroke-dashoffset': '0'
                    }
                }
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
                'pulse-light': 'pulse-light 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in-scale': 'fade-in-scale 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'slide-up': 'slide-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'reveal-dag': 'reveal-dag 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'draw-lines': 'draw-lines 1.8s ease-out forwards'
			},
			typography: (theme) => ({
				DEFAULT: {
					css: {
						color: 'hsl(var(--foreground))',
						a: {
							color: 'hsl(var(--primary))',
							'&:hover': {
								color: 'hsl(var(--primary) / 0.8)',
							},
							textDecoration: 'none',
						},
						'h1, h2, h3, h4, h5, h6': {
							color: 'hsl(var(--foreground))',
							fontWeight: '600',
						},
						h1: {
							fontSize: '2.25rem',
							marginBottom: '1.5rem',
							fontWeight: '700',
						},
						h2: {
							fontSize: '1.75rem',
							marginTop: '2rem',
							marginBottom: '1rem',
							paddingBottom: '0.5rem',
							borderBottom: '1px solid hsl(var(--border))',
						},
						h3: {
							fontSize: '1.5rem',
							marginTop: '1.5rem',
							marginBottom: '0.75rem',
						},
						blockquote: {
							borderLeft: `4px solid hsl(var(--muted))`,
							padding: '0.5rem 0 0.5rem 1rem',
							color: 'hsl(var(--muted-foreground))',
							fontStyle: 'italic',
						},
						'ul, ol': {
							paddingLeft: '1.25rem',
						},
						code: {
							color: 'hsl(var(--primary))',
							fontWeight: '500',
							padding: '0.2rem 0.4rem',
							backgroundColor: 'hsl(var(--muted) / 0.5)',
							borderRadius: '0.25rem',
						},
						pre: {
							backgroundColor: 'hsl(var(--muted) / 0.3)',
							padding: '1rem',
							borderRadius: '0.5rem',
							overflowX: 'auto',
						},
						'pre code': {
							backgroundColor: 'transparent',
							padding: '0',
							color: 'inherit',
							fontWeight: 'inherit',
						},
						strong: {
							color: 'hsl(var(--foreground))',
							fontWeight: '600',
						},
						table: {
							width: '100%',
							borderCollapse: 'collapse',
							captionSide: 'bottom',
						},
						'thead, tbody': {
							borderColor: 'hsl(var(--border))',
						},
						'th, td': {
							padding: '0.75rem',
							borderWidth: '1px',
							borderColor: 'hsl(var(--border))',
						},
						th: {
							backgroundColor: 'hsl(var(--muted) / 0.2)',
							fontWeight: '600',
						},
						img: {
							borderRadius: '0.5rem',
							maxWidth: '100%',
						},
						hr: {
							borderColor: 'hsl(var(--border))',
							margin: '2rem 0',
						},
					},
				},
				dark: {
					css: {
						color: 'hsl(var(--foreground))',
						a: {
							color: 'hsl(var(--primary))',
						},
						'h1, h2, h3, h4, h5, h6': {
							color: 'hsl(var(--foreground))',
						},
						strong: {
							color: 'hsl(var(--foreground))',
						},
						blockquote: {
							borderLeftColor: 'hsl(var(--muted))',
							color: 'hsl(var(--muted-foreground))',
						},
						code: {
							color: 'hsl(var(--primary))',
							backgroundColor: 'hsl(var(--muted) / 0.2)',
						},
						pre: {
							backgroundColor: 'hsl(var(--muted) / 0.2)',
						},
						th: {
							backgroundColor: 'hsl(var(--muted) / 0.2)',
						},
					},
				},
			}),
		}
	},
	plugins: [
		// @ts-ignore
		require("tailwindcss-animate"), 
		// @ts-ignore
		require('@tailwindcss/typography')
	],
} satisfies Config;
