node {
  def appName = 'nazuna'
  def imageTag = "opsta/${appName}:${env.BRANCH_NAME}"

  checkout scm

  stage 'Build image'
  sh("docker build -t ${imageTag} .")

  stage 'Push image to registry'
  sh("docker push push ${imageTag}")

  stage "Deploy Application"
  switch (env.BRANCH_NAME) {
    // Roll out a dev environment
    default:
      sh("helm delete --purge nazuna-dev")
      sh("helm install --namespace dev -f k8s/helm-nodejs/values-nazuna-dev.yaml --name nazuna-dev k8s/helm-nodejs")
  }
}
