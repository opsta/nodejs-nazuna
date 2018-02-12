properties([
  parameters([
    choice(choices: 'deploy-by-branch\ntagging\ndeploy-production', description: 'Action to do', name: 'ACTION', defaultValue: 'deploy-by-branch')
  ]),
  gitLabConnection('gitlab-opsta')
])

podTemplate(label: 'nazuna-slave', containers: [
    containerTemplate(name: 'docker', image: 'docker', ttyEnabled: true, command: 'cat'),
    containerTemplate(name: 'helm', image: 'lachlanevenson/k8s-helm', command: 'cat', ttyEnabled: true),
    containerTemplate(name: 'git', image: 'paasmule/curl-ssl-git', command: 'cat', ttyEnabled: true)
  ],
  volumes: [
    hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock'),
]) {
  node('nazuna-slave') {

    appName = 'nazuna'

    if(params.ACTION == "tagging") {

      stage('Pull UAT image and tag to production image') {
        container('docker') {
          imageTag = "opsta/${appName}:uat"
          imageTagProd = "opsta/${appName}:build-${env.BUILD_NUMBER}"
          withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_HUB_USER', passwordVariable: 'DOCKER_HUB_PASSWORD')]) {
            sh """
              docker login -u $DOCKER_HUB_USER -p $DOCKER_HUB_PASSWORD
              docker pull ${imageTag}
              docker tag ${imageTag} ${imageTagProd}
              docker push ${imageTagProd}
              """
          }
          // Get commit id to tag from docker image
          CODE_VERSION = sh (
            script: "docker run -it --rm ${imageTagProd} cat VERSION",
            returnStdout: true
          ).trim()
        }
      }

      stage('Tag commit id to version and push code') {
        container('git') {
          checkout ([$class: 'GitSCM',
            branches: [[name: CODE_VERSION ]]
          ])
          sh """
            git tag build-${env.BUILD_NUMBER}
            git push --tags
            """
        }
      }

    } else if(params.ACTION == "deploy-production") {
      // Deploy to production
    } else if(params.ACTION == "deploy-by-branch") {
      switch (env.BRANCH_NAME) {
        case "master":
          imageTag = "opsta/${appName}:uat"
          break
        case "dev":
          imageTag = "opsta/${appName}:dev"
          break
      }

      scmVars = checkout scm

      stage('Build image') {
        container('docker') {
          sh """
            echo ${scmVars.GIT_COMMIT} > VERSION
            docker build -t ${imageTag} .
            """
        }
      }

      stage('Push image to registry') {
        container('docker') {
          withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_HUB_USER', passwordVariable: 'DOCKER_HUB_PASSWORD')]) {
            sh """
              docker login -u $DOCKER_HUB_USER -p $DOCKER_HUB_PASSWORD
              docker push ${imageTag}
              """
          }
        }
      }

      stage("Deploy Application") {
        container('helm') {
          // Put kubeconfig file
          withCredentials([file(credentialsId: 'gce-k8s-kubeconfig', variable: 'KUBECONFIG')]) {
            sh """
              mkdir -p ~/.kube/
              cat $KUBECONFIG > ~/.kube/config
              """
          }
          switch (env.BRANCH_NAME) {
            // Roll out a UAT environment on master branch
            case "master":
              sh """
                helm delete --purge nazuna-uat || true
                helm install --namespace uat -f k8s/helm-nodejs/values-nazuna-uat.yaml --wait --name nazuna-uat k8s/helm-nodejs
                """
              break

            // Roll out a dev environment
            case "dev":
              sh """
                helm delete --purge nazuna-dev || true
                helm install --namespace dev -f k8s/helm-nodejs/values-nazuna-dev.yaml --wait --name nazuna-dev k8s/helm-nodejs
                """
              break
          }
        }
      }
    }
  }
}
