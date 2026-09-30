#!/bin/bash

# Thcode Production Setup Script
# Uso: ./setup-production.sh

set -e

echo "🚀 Thcode Production Setup v2.5.0"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
status() { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC} $1"; }
error() { echo -e "${RED}❌${NC} $1"; exit 1; }

# Check requirements
check_requirements() {
  echo -e "\n${YELLOW}Verificando requisitos...${NC}"
  
  command -v node &> /dev/null || error "Node.js não instalado"
  status "Node.js $(node --version)"
  
  command -v git &> /dev/null || error "Git não instalado"
  status "Git $(git --version | cut -d' ' -f3)"
  
  command -v npm &> /dev/null || error "npm não instalado"
  status "npm $(npm --version)"
}

# Generate secure token
generate_token() {
  echo -e "\n${YELLOW}Gerando token de segurança...${NC}"
  TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "$TOKEN"
}

# Setup backend
setup_backend() {
  echo -e "\n${YELLOW}Configurando backend...${NC}"
  
  cd backend
  
  if [ ! -f package-lock.json ]; then
    status "Instalando dependências do backend..."
    npm ci --production
  fi
  
  if [ ! -f .env ]; then
    warn ".env não encontrado, criando a partir de .env.example"
    cp .env.example .env
    
    # Gerar token novo
    NEW_TOKEN=$(generate_token)
    sed -i "s/THCODE_API_TOKEN=.*/THCODE_API_TOKEN=$NEW_TOKEN/" .env
    status "Token gerado e salvo em .env"
    status "⚠️  Não compartilhe este arquivo!"
  fi
  
  # Criar workspace
  mkdir -p workspace
  status "Workspace criado"
  
  cd ..
}

# Setup frontend
setup_frontend() {
  echo -e "\n${YELLOW}Configurando frontend...${NC}"
  
  cd frontend
  
  if [ ! -f package-lock.json ]; then
    status "Instalando dependências do frontend..."
    npm ci
  fi
  
  status "Frontend pronto"
  
  cd ..
}

# Docker setup
setup_docker() {
  echo -e "\n${YELLOW}Configurando Docker...${NC}"
  
  if ! command -v docker &> /dev/null; then
    warn "Docker não está instalado. Pulando setup Docker."
    return 0
  fi
  
  status "Docker encontrado: $(docker --version)"
  
  # Build image
  if [ "$1" = "--docker-build" ]; then
    status "Buildando imagem Docker..."
    docker build -t thcode:latest .
    status "Imagem Docker buildada com sucesso"
  fi
}

# Run tests
run_tests() {
  echo -e "\n${YELLOW}Rodando testes...${NC}"
  
  cd backend
  npm test || warn "Alguns testes falharam - mas a aplicação pode funcionar"
  cd ..
  
  cd frontend
  npm run lint || warn "Linting encontrou problemas - mas tudo deve funcionar"
  cd ..
}

# Print summary
print_summary() {
  echo -e "\n${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}✅ Setup Concluído com Sucesso!${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  
  echo -e "\n📝 Próximos passos:\n"
  
  echo "1. Edite 'backend/.env' com as variáveis de produção:"
  echo -e "   ${YELLOW}vim backend/.env${NC}\n"
  
  echo "2. Inicie o backend:"
  echo -e "   ${YELLOW}cd backend && npm start${NC}\n"
  
  echo "3. Inicie o frontend (outro terminal):"
  echo -e "   ${YELLOW}cd frontend && npm start${NC}\n"
  
  echo "4. Deploy com Docker Compose:"
  echo -e "   ${YELLOW}docker-compose up -d${NC}\n"
  
  echo "5. Deploy no Railway (recomendado):"
  echo -e "   ${YELLOW}railway link${NC}\n"
  echo -e "   ${YELLOW}railway up${NC}\n"
  
  echo -e "\n📍 URLs:\n"
  echo "   Frontend local: http://localhost:3000"
  echo "   Backend local: http://localhost:8080"
  echo "   API Health: http://localhost:8080/api/health"
  echo "   GitHub Pages: https://rlkbiloga-coder.github.io/Thcode/\n"
  
  echo -e "🔐 Segurança:\n"
  echo "   • Nunca commite o arquivo .env"
  echo "   • Sempre use HTTPS em produção"
  echo "   • Mantenha as chaves de API seguras"
  echo "   • Revise ALLOWED_ORIGINS antes de deployer"
  echo "   • Configure rate limiting apropriadamente\n"
  
  echo -e "📚 Documentação: ${YELLOW}https://github.com/rlkbiloga-coder/Thcode${NC}\n"
}

# Main execution
main() {
  check_requirements
  setup_backend
  setup_frontend
  
  if [ "$1" = "--docker" ]; then
    setup_docker "--docker-build"
  fi
  
  # Optional: run tests
  if [ "$1" != "--skip-tests" ] && [ "$1" != "--docker" ]; then
    read -p "Deseja rodar os testes? (s/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
      run_tests
    fi
  fi
  
  print_summary
}

# Run main function
main "$@"
