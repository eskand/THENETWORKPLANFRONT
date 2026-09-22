// ============================================================
//  THENETWORKPLANFRONT — pipeline Jenkins (React 19 / Vite / Vitest)
//
//  Étapes :
//    1. Dépendances        npm ci
//    2. Lint               oxlint
//    3. Tests              vitest + rapport JUnit + couverture lcov
//    4. Analyse SonarQube  sonar-scanner (sonar-project.properties), puis
//                          attente du Quality Gate
//    5. Image Docker       docker build (Dockerfile : vite build + nginx)
//    6. Publication        docker push vers le registre — sur main seulement
//    7. Déploiement        kubectl set image sur le Deployment — sur main,
//                          si CI_DEPLOY=true sur le contrôleur
//
//  Ce qu'il attend de Jenkins :
//    - outil NodeJS « node24 » (plugin NodeJS) ;
//    - outil SonarQube Scanner « sonar-scanner » (plugin SonarQube Scanner) ;
//    - serveur SonarQube « sonarqube » avec son jeton, et le webhook
//      SonarQube → Jenkins pour waitForQualityGate ;
//    - identifiant « registry-credentials » (registre d'images) ;
//    - identifiant « kubeconfig-netplus » (fichier kubeconfig) si CI_DEPLOY ;
//    - docker et kubectl sur l'agent.
//
//  Variables posées sur le contrôleur (facultatives) :
//    CI_REGISTRY   registre des images, défaut ghcr.io/eskand
//    CI_DEPLOY     « true » pour déployer main sur le cluster
//
//  Il tourne sur un agent Linux ou Windows : chaque commande passe par
//  `run`, qui choisit `sh` ou `bat`. Ces fonctions ne sont pas des étapes
//  déclaratives, d'où les blocs script { } qui les entourent.
//
//  Voir docs/50_JENKINS.md et docs/60_DOCKER_KUBERNETES.md du dépôt parent.
// ============================================================

def run(String cmd)       { isUnix() ? sh(cmd) : bat(cmd) }
def runStatus(String cmd) { isUnix() ? sh(script: cmd, returnStatus: true) : bat(script: cmd, returnStatus: true) }
def runOut(String cmd)    { (isUnix() ? sh(script: cmd, returnStdout: true) : bat(script: '@' + cmd, returnStdout: true)).trim() }
def dockerTag(String s)   { s.replaceAll(/[^A-Za-z0-9_.-]/, '-').take(128) }

pipeline {
    agent any

    tools {
        nodejs 'node24'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 30, unit: 'MINUTES')
    }

    environment {
        CI = 'true'
        NPM_CONFIG_FUND = 'false'
        NPM_CONFIG_AUDIT = 'false'

        REGISTRY   = "${env.CI_REGISTRY ?: 'ghcr.io/eskand'}"
        IMAGE      = "${REGISTRY}/netplus-front"
        K8S_NS     = 'netplus'
        K8S_DEPLOY = 'netplus-front'
    }

    stages {

        stage('Dépendances') {
            steps {
                script {
                    env.SHORT_SHA  = (env.GIT_COMMIT ?: runOut('git rev-parse HEAD')).take(7)
                    env.BRANCH_TAG = dockerTag(env.BRANCH_NAME ?: 'local')
                    run 'npm ci'
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    run 'npm run lint'
                }
            }
        }

        stage('Tests') {
            steps {
                script {
                    // JUnit pour Jenkins, lcov pour SonarQube (vite.config.js → coverage).
                    run 'npm test -- --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml --coverage.enabled=true'
                }
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml', allowEmptyResults: true
                }
            }
        }

        stage('Analyse SonarQube') {
            steps {
                script {
                    def scannerHome = tool 'sonar-scanner'
                    def scanner = isUnix() ? "${scannerHome}/bin/sonar-scanner" : "\"${scannerHome}\\bin\\sonar-scanner.bat\""
                    // withSonarQubeEnv fournit SONAR_HOST_URL et SONAR_AUTH_TOKEN ; le reste
                    // (projectKey, sources, lcov) est dans sonar-project.properties.
                    // Le jeton est passé explicitement en sonar.token : SonarQube 2025.1+
                    // n'accepte plus le sonar.login que le plugin injecte, et sans cela le
                    // scanner part anonyme (HTTP 401). Simples quotes : c'est le shell qui
                    // lit la variable, le secret ne passe pas par Groovy.
                    def tokenArg = isUnix() ? '-Dsonar.token=$SONAR_AUTH_TOKEN' : '-Dsonar.token=%SONAR_AUTH_TOKEN%'
                    withSonarQubeEnv('sonarqube') {
                        run(scanner + ' ' + tokenArg + ' -Dsonar.projectVersion=' + env.SHORT_SHA)
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Image Docker') {
            steps {
                script {
                    // Le Dockerfile refait npm ci + vite build dans une image Node propre :
                    // ce qui est livré est ce qui a été construit dans l'image, pas sur l'agent.
                    // Sans --pull et avec retry : un aléa réseau vers Docker Hub ne casse
                    // pas le build (voir le Jenkinsfile du back).
                    retry(2) {
                        run "docker build -t ${env.IMAGE}:${env.SHORT_SHA} -t ${env.IMAGE}:${env.BRANCH_TAG} ."
                    }
                }
            }
        }

        stage('Publication') {
            when { branch 'main' }
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'registry-credentials',
                                                      usernameVariable: 'REG_USER',
                                                      passwordVariable: 'REG_PASS')]) {
                        run(isUnix()
                            ? 'echo "$REG_PASS" | docker login -u "$REG_USER" --password-stdin ' + env.REGISTRY
                            : 'echo %REG_PASS%| docker login -u %REG_USER% --password-stdin ' + env.REGISTRY)
                    }
                    run "docker push ${env.IMAGE}:${env.SHORT_SHA}"
                    run "docker push ${env.IMAGE}:${env.BRANCH_TAG}"
                }
            }
        }

        stage('Déploiement') {
            when {
                allOf {
                    branch 'main'
                    environment name: 'CI_DEPLOY', value: 'true'
                }
            }
            steps {
                script {
                    withKubeConfig([credentialsId: 'kubeconfig-netplus']) {
                        run "kubectl -n ${env.K8S_NS} set image deployment/${env.K8S_DEPLOY} ${env.K8S_DEPLOY}=${env.IMAGE}:${env.SHORT_SHA}"
                        run "kubectl -n ${env.K8S_NS} rollout status deployment/${env.K8S_DEPLOY} --timeout=5m"
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                if (env.SHORT_SHA) {
                    runStatus "docker image rm -f ${env.IMAGE}:${env.SHORT_SHA} ${env.IMAGE}:${env.BRANCH_TAG}"
                }
                runStatus 'docker logout ' + env.REGISTRY
            }
        }
    }
}
