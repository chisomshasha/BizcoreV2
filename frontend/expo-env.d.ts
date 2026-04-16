cat > expo-env.d.ts << 'EOF'
declare module '@env' {
  export const API_URL: string;
}
EOF
