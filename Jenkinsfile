properties([
  gitLabConnection('gitlab-opsta'),
  parameters([
    choice(choices: 'deploy-by-branch\ntagging\ndeploy-production', description: 'Action to do', name: 'ACTION'),
    [$class: 'GitParameterDefinition', branch: '', branchFilter: '.*', defaultValue: '', description: 'Choose tag to deploy (Need to combine with ACTION = deploy-production)', name: 'TAG', quickFilterEnabled: false, selectedValue: 'NONE', sortMode: 'DESCENDING_SMART', tagFilter: 'build-*', type: 'PT_TAG']
  ])
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
            script: "docker run --rm ${imageTagProd} cat VERSION",
            returnStdout: true
          ).trim()
        }
      }

      stage('Tag commit id to version and push code') {
        container('git') {
          sshagent(credentials: ['nazuna-git-deploy-key']) {
            checkout scm
            checkout([$class: 'GitSCM',
              branches: [[name: CODE_VERSION ]]
            ])
            sh """
              git tag build-${env.BUILD_NUMBER}
              SSH_AUTH_SOCK=${env.SSH_AUTH_SOCK} GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no" git push --tags
              """
          }
        }
      }

    } else if(params.ACTION == "deploy-production") {
      // Deploy to production
      stage('Deploy production') {
        checkout scm
        container('helm') {
          withCredentials([file(credentialsId: 'gce-k8s-kubeconfig', variable: 'KUBECONFIG')]) {
            sh """
              mkdir -p ~/.kube/
              cat $KUBECONFIG > ~/.kube/config
              sed -i 's/tag: .*/tag: ${params.TAG}/g' k8s/helm-nodejs/values-nazuna-prod.yaml
              helm upgrade --namespace prod -f k8s/helm-nodejs/values-nazuna-prod.yaml --wait nazuna-prod k8s/helm-nodejs
              """
          }
        }
      }

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
