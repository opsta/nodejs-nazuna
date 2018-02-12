podTemplate(label: 'nazuna-slave', containers: [
    containerTemplate(name: 'docker', image: 'docker', ttyEnabled: true, command: 'cat'),
    containerTemplate(name: 'helm', image: 'lachlanevenson/k8s-helm:latest', command: 'cat', ttyEnabled: true)
  ],
  volumes: [
    hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock'),
]) {
  node('nazuna-slave') {
    def appName = 'nazuna'
    // TODO
    def imageTag = "opsta/${appName}:dev"

    checkout scm

    stage('Build image') {
      container('docker') {
        sh("docker build -t ${imageTag} .")
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
        switch (env.BRANCH_NAME) {
          // Roll out a dev environment
          default:
            withCredentials([file(credentialsId: 'gce-k8s-kubeconfig', variable: 'KUBECONFIG')]) {
              sh """
                mkdir -p ~/.kube/
                cat $KUBECONFIG > ~/.kube/config
                helm delete --purge nazuna-dev || true
                helm install --namespace dev -f k8s/helm-nodejs/values-nazuna-dev.yaml --wait --name nazuna-dev k8s/helm-nodejs
                """
            }
        }
      }
    }
  }
}
