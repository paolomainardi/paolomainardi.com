+++
date = "2023-07-09"
title = "Have we reached a point of no return on managing software dependencies?"
slug = "point-of-no-return-on-managing-software-dependencies"
tags = ["supply-chain", "security", "dependencies"]
draft = "false"
featuredImage = "/images/posts/7-supply-chain/sonatype-graph.webp"
images = ["/images/posts/7-supply-chain/sonatype-graph.webp"]
+++

**Software Supply Chain security** issues are hitting hard the whole OSS ecosystem; [not a day goes by without a security incident](https://www.sonatype.com/resources/vulnerability-timeline) going into the wild, affecting unaware users and companies with software built with the modern patterns of ********************ultra composability******************** made of a dense number of external dependencies in multiple layers.

According to the research conducted by Sonatype in their annual [State of Software Supply Chain](https://www.sonatype.com/state-of-the-software-supply-chain/open-source-supply-demand-security), Supply Chain attacks have an average increase of  **742% per year.**

There are several reasons behind it, such as the higher market demand for software in all sectors and the tremendous growth of the open-source model; [it is estimated that 90%](https://octoverse.github.com/) of companies use open-source.

Another aspect that underpins this situation is the discovery and the evolution of cyber attacks specifically designed to attach the supply chain, like Dependency Confusion, Typosquatting and its Cousin–Brandjacking, Malicious Code Injections and Protestware.

According to the [industry data](https://github.blog/2022-04-28-best-practices-to-keep-your-projects-secure-on-github/#staying-on-top-of-dependency-security), the median number of transitive (indirect) dependencies for a JavaScript project on GitHub is **683**.

Dependencies remain one of the preferred mechanisms for creating and distributing malicious packages, and it is still relatively easy to forge them.

> In February 2022, GitHub **[introduced mandatory two-factor authentication for the top 100 npm maintainers](https://github.blog/2022-02-01-top-100-npm-package-maintainers-require-2fa-additional-security/)** and **[PyPA is working to reduce dependence on setup.py](https://setuptools.pypa.io/en/latest/userguide/development_mode.html)**, which is a key element to how these attacks can launch alongside while promoting **[2FA adoption using a public dashboard](https://p.datadoghq.com/sb/7dc8b3250-389f47d638b967dbb8f7edfd4c46acb1?from_ts=1662301978564&to_ts=1662388378564&live=true)** (Source: [https://www.sonatype.com/state-of-the-software-supply-chain/open-source-supply-demand-security](https://www.sonatype.com/state-of-the-software-supply-chain/open-source-supply-demand-security))

To see the numbers in action, we will test two of the most used languages in 2022, which are Javascript and Python, and then finally a Microservices-based project made of several languages.

## Javascript

Going to bootstrap a **plain** **Javascript NextJS codebase** using the provided default settings:

```shell
❯ npx create-next-app@latest
✔ What is your project named? … supply-chain
✔ Would you like to use TypeScript with this project? … No / Yes
✔ Would you like to use ESLint with this project? … No / Yes
✔ Would you like to use Tailwind CSS with this project? … No / Yes
✔ Would you like to use `src/` directory with this project? … No / Yes
✔ Use App Router (recommended)? … No / Yes
✔ Would you like to customize the default import alias? … No / Yes
Creating a new Next.js app in /Users/paolomainardi/temp/supply-chain.

Using npm.

Initializing project with template: app-tw

Installing dependencies:
- react
- react-dom
- next
- typescript
- @types/react
- @types/node
- @types/react-dom
- tailwindcss
- postcss
- autoprefixer
- eslint
- eslint-config-next

added 344 packages, and audited 345 packages in 4s

127 packages are looking for funding
  run `npm fund` for details

5 moderate severity vulnerabilities

To address all issues, run:
  npm audit fix

Run `npm audit` for details.
Initialized a git repository.

Success! Created supply-chain at /dev/supply-chain
```

One thing to note is that a newly installed app already has **5 moderate severity vulnerabilities**. This way of delivering messages is risky because it inadvertently teaches our brain to ignore them, whether they are useful or not. The next time a warning like this appears, it may go unnoticed. We should do better in how we present these messages.

Let’s now count the dependencies:

```shell
❯ tree -d supply-chain/node_modules -L 1 | tail -n 1
298 directories
```

To print a Hello World with NextJS, we need to bring **298 dependencies** with **5 known vulnerabilities**.

We package the application in an OCI container, as [explained here in the official doc](https://github.com/vercel/next.js/blob/canary/examples/with-docker/Dockerfile):

```shell
❯ curl -Lo Dockerfile https://raw.githubusercontent.com/vercel/next.js/canary/examples/with-docker/Dockerfile

❯ # Edit this file according to the documentation to produce a standalone build.
// next.config.js
module.exports = {
  // ... rest of the configuration.
  output: 'standalone',
}

❯ docker build -t supply-chain-next-docker .
[+] Building 33.0s (19/19) FINISHED
=> => naming to docker.io/library/supply-chain-next-docker                                  0.0s

❯ syft supply-chain-next-docker > deps
 ✔ Loaded image
 ✔ Parsed image
 ✔ Cataloged packages      [282 packages]

❯ grep apk deps | wc -l
17

❯ grep npm deps | wc -l
249

# Scan for known vulnerabilities.
❯ grype supply-chain-next-docker
 ✔ Loaded image
 ✔ Parsed image
 ✔ Cataloged packages      [282 packages]
 ✔ Scanning image...       [1 vulnerabilities]
   ├── 0 critical, 0 high, 1 medium, 0 low, 0 negligible
   └── 1 fixed
NAME    INSTALLED  FIXED-IN  TYPE  VULNERABILITY        SEVERITY
semver  7.3.8      7.5.2     npm   GHSA-c2qf-rxjj-qqgw  Medium
```

In this case, the build produced by the [NextJS](https://nextjs.org/) is a bit smaller in terms of packages ([cause using standalone mode](https://nextjs.org/docs/app/api-reference/next-config-js/output)), and Alpine base image adds just 17 packages at the moment without any known vulnerability.

This is an image ready to be shipped in production, and it counts **282 packages (NPM + Alpine)** without any modification made by us; it is just the bare framework.

The large package sizes in NodeJS are primarily due to the relatively small JavaScript standard library and the Unix-inspired philosophy behind NodeJS, as explained in [this blog post](https://blog.izs.me/2013/04/unix-philosophy-and-nodejs/).

The aforementioned philosophy can sometimes lead to distortions, such as the case of packages like "left-pad" becoming part of many packages (even as a transitive dependency). This almost caused the [internet to break down](https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm) when the author decided to remove it due to a name dispute. You can read more about it here.

I guess this event also inspired this famous [xkcd](https://xkcd.com/) meme:

![nebraska](/images/posts/7-supply-chain/nebraska-meme.webp)

## Python

It is the second most used and the fastest growing language, with more than 22 percent year over year (source: [https://github.blog/2023-03-02-why-python-keeps-growing-explained/](https://github.blog/2023-03-02-why-python-keeps-growing-explained/)).

To compare with Javascript, I will use Django as a test case.

```yaml
❯ cat app/requirements.txt
Django==4.2.2

❯ cat app/Dockerfile
FROM python:3.10-alpine
EXPOSE 8000
WORKDIR /app
COPY requirements.txt /app
RUN pip3 install -r requirements.txt --no-cache-dir
COPY . /app
ENTRYPOINT ["python3"]
CMD ["manage.py", "runserver", "0.0.0.0:8000"]

❯ syft django-web
 ✔ Loaded image
 ✔ Parsed image
 ✔ Cataloged packages      [46 packages]

❯ grep apk deps | wc -l
 38
❯ grep python deps | wc -l
 8
❯ grep binary deps | wc -l
 2

# Scan for known vulnerabilities.
❯ grype django-web
 ✔ Vulnerability DB        [no update available]
 ✔ Loaded image
 ✔ Parsed image
 ✔ Cataloged packages      [46 packages]
 ✔ Scanning image...       [2 vulnerabilities]
   ├── 0 critical, 1 high, 1 medium, 0 low, 0 negligible
   └── 0 fixed

NAME    INSTALLED  FIXED-IN  TYPE    VULNERABILITY   SEVERITY
pip     23.1.2               python  CVE-2018-20225  High
python  3.11.4               binary  CVE-2007-4559   Medium
```

The situation here is better; Django has just 8 dependencies (at least the ones discovered by [Syft](https://github.com/anchore/syft)).

As Python is the best-in-class language for AI, I wanted to try to add [PyTorch](https://pytorch.org/) as a project dependency:

```yaml
❯ cat app/requirements.txt
Django==4.2.2
--extra-index-url https://download.pytorch.org/whl/cpu
torch
torchvision
torchaudio

# We need a glibc base image to install pytorch.
❯ cat app/Dockerfile
FROM python:3.11.4
...

❯ grep binary deps | wc -l
 2
❯ grep python deps | wc -l
 35
❯ grep deb deps | wc -l
 429

❯ grype django-web
 ✔ Vulnerability DB        [no update available]
 ✔ Loaded image
 ✔ Parsed image
 ✔ Cataloged packages      [455 packages]
 ✔ Scanning image...       [678 vulnerabilities]
   ├── 1 critical, 41 high, 111 medium, 30 low, 464 negligible (31 unknown)
   └── 3 fixed
```

Even with PyTorch and its dependencies, the number of Python packages is relatively small, just 35; what is way bigger now is the number of packages carried back from the Debian base image (required to use PyTorch instead of Alpine), to be more precise **429 packages** with an **insane number of known vulnerabilities**, even if this image is the latest stable [Python 3.11 release](https://hub.docker.com/layers/library/python/3.11.4/images/sha256-35483f08b07e42d712ba92576c0d09e7a077d33677855d3276190b65dc4aec30?context=explore).

### Test Results

We can see here the summarized results:

|  | Language | Container | Vulnerabilities (> medium) |
| --- | --- | --- | --- |
| NextJS (Javascript + Alpine) | 282 | 17 | 1 |
| Django (Python + Alpine) | 8 | 38 | 2 |
| Django + PyTorch (Python + Debian) | 35 | 429 | 152 |

It comes as no surprise that the number of JavaScript packages is much larger than that of Python. This is due to the nature of JavaScript, which has small and vertical libraries that perform one specific task.

Another interesting piece of data, which may not come as a big surprise too, is that containers based on pure Debian are large and have many known vulnerabilities, even if they are official.

> CVEs vulnerabilities must be taken with care; we can see many false positives, and not everything can be exploited; that’s why Chainguard and key players in the industry have created [OpenVex](https://www.chainguard.dev/unchained/accelerate-vex-adoption-through-openvex), to simplify is a database of “negative” vulnerabilities that can be distributed alongside artifacts to inform consumers about real exploitable threats.

Now that we have a general overview of the 2 most used language ecosystems let’s see the impact of those numbers when applied to a microservices-based project.

## Microservices architecture and dependencies

For this test, I will use a very nice project from GCP: [Online Boutique is a cloud-first microservices demo application](https://github.com/GoogleCloudPlatform/microservices-demo) that is primarily intended to demonstrate the use of technologies like Kubernetes, GKE, Istio, Stackdriver, and gRPC and it is composed of **11 microservices** in **5 different** **languages**: Go, Node.js, Python, Java, C#

- Another important assumption to do here is that this project due to its nature is more optimized on the cloud parts than on the development aspects, such as dependencies

```jsx
# Calculate packages and vulnerabilities for each microservice.

DOCKER_IMAGES="gcr.io/google-samples/microservices-demo/emailservice:v0.8.0,
gcr.io/google-samples/microservices-demo/checkoutservice:v0.8.0,
gcr.io/google-samples/microservices-demo/recommendationservice:v0.8.0,
gcr.io/google-samples/microservices-demo/frontend:v0.8.0,
gcr.io/google-samples/microservices-demo/paymentservice:v0.8.0,
gcr.io/google-samples/microservices-demo/productcatalogservice:v0.8.0,
gcr.io/google-samples/microservices-demo/cartservice:v0.8.0,
gcr.io/google-samples/microservices-demo/loadgenerator:v0.8.0,
gcr.io/google-samples/microservices-demo/currencyservice:v0.8.0,
gcr.io/google-samples/microservices-demo/shippingservice:v0.8.0,
gcr.io/google-samples/microservices-demo/adservice:v0.8.0"

for image in $(echo $DOCKER_IMAGES | sed "s/,/ /g")
do
  echo "Scanning image: $image"
  syft $image > /dev/null
  grype $image > /dev/null
done%
```

Let’s strip the vulnerabilities lower than high and format the data in a table:

| Microservice | Language | Packages | ≥ High vulnerabilities |
| --- | --- | --- | --- |
| emailservice | Python | 152 | 39 |
| checkoutservice | Go | 52 | 2 |
| recommendationservice | Python | 147 | 39 |
| frontend | Go | 71 | 8 |
| paymentservice | Node.js | 626 | 5 |
| productcatalogservice | Go | 51 | 5 |
| cartservice | C# | 25 | 0 |
| loadgenerator | Python/Locust | 137 | 33 |
| currencyservice | Node.js | 649 | 5 |
| shippingservice | Go | 37 | 3 |
| adservice | Java | 112 | 19 |
| TOTAL |  | **2059** | **158** |

Here we can see the entire surface of this microservices-based application, an agglomerate of programming language and operating system dependencies, for **2095 packages** with **158 high and critical** known vulnerabilities, huge numbers.

Node.js, again, is the most dependencies-hungry. Instead, Python has fewer dependencies but more open vulnerabilities; Java is very close to Python with the numbers.

The clear winner in this scenario is C#, just 25 libraries aggregated and 0 vulnerabilities.

## Closing thoughts

Sonatype well summarizes the non-stoppable growth of the OSS ecosystem:

![sonatype-supply-chain-stats](/images/posts/7-supply-chain/sonatype-supply-chain-stats.webp)

The data show that:

1. Open source development is more florid than ever; **OSS won**.
2. The growth is spread across all the biggest ecosystems, which is very good for the entire industry; there isn’t a monopoly actor.
3. An average ecosystem has **3.3M of projects**, each with an average of **14 versions released** yearly, which is good because the project is maintained and bad because it requires maintenance.

Today we are exposed to a high extent of complexity hidden by very powerful tools.

Grabbing a new dependency is a very low-effort task; with a modern package manager, we can assemble entire operating systems and applications composed of hundreds of thousands of external dependencies, with just one or few easy commands, and this is frankly powerful and scary

In 1984, Edsger Wybe Dijkstra in the article “[On the nature of Computing Science](https://www.cs.utexas.edu/users/EWD/transcriptions/EWD08xx/EWD896.html)” said that *“Simplicity is a great virtue but it requires hard work to achieve it and education to appreciate it. And to make matters worse: complexity sells better”.*

For my personal experience, in many years in this sector, one of the biggest enemy of this industry are the one-size-fits-all solutions that can magically solve and fix any problem, in any context, regarding the complexity of the problem, this is never the case, better to focus on the complexity of the problem.

For example, if i need to ship a static website with a bunch of HTML and CSS, i’ll never ever have the need to deploy it on a Kubernetes cluster, instead all i need is a not-so-fancy webserver.

The same apply for microservices, it’s not always the right fit even when the scenario can suggest otherwise, there are important cases like [Istio](https://www.computer.org/csdl/magazine/so/2021/05/09520758/1wiMujJmZ3i) or [Amazon Prime Video.](https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90?utm_source=thenewstack&utm_medium=website&utm_content=inline-mention&utm_campaign=platform)

**And now, going back to the question of this article.**

**The answer is yes** we are over the point of no return and and that's not necessarily a bad thing, on the contrary i think that we are living the golden era of this industry and we have so much many opportunities as professionals or scientists like never before.

However, this also means that most projects rely on large amounts of code that may be vulnerable or malicious. This causes stress for developers and poses significant risks for the entire industry. In some cases, it can even endanger national security, as demonstrated by the [Solarwinds case](https://www.solarwinds.com/sa-overview/securityadvisory).

Today creating a new software product should raise some fundamental questions, such as:

- How can we trust that someone different from us can always play as a good actor?
- How can we be sure that all the code we depend on is made exclusively to do what it claims?
- How can we be sure that the software has not been tampered in one of the point of the [supply chain](https://slsa.dev/spec/v1.0/threats-overview)?

In 1984, Ken Thompson, in the famous paper “[Reflections on Trusting Trust](https://www.cs.cmu.edu/~rdriley/487/papers/Thompson_1984_ReflectionsonTrustingTrust.pdf)” basically asked the same questions, and the moral, which I think is still valid, says that:

- *“You can’t trust code that you did not totally create yourself. No amount of source-level verification or scrutiny will protect from using trusted code. To what extent should one trust a statement that a program is free of Trojan horses? Perhaps it is more important to trust the people who wrote the software.”*

Even though it may have been possible to meet the developers who created and used third-party libraries in the past, it is not as feasible today due to the increased number of actors involved. Additionally, [Protestware Attacks](https://about.gitlab.com/blog/2023/05/09/rise-of-protestware/) can pose a strong threat that cannot be easily countered.

## Takeaways

So, here 8 **practical tasks**:

1. Don't fall into the trap of using too many external libraries, think twice if you really need it, when in doubt think to [left-pad](https://qz.com/646467/how-one-programmer-broke-the-internet-by-deleting-a-tiny-piece-of-code) disaster.
2. [Microservices vs Monolith](https://blog.sparkfabrik.com/en/microservices-and-cloud-native-applications-vs-monolithic-applications) is not choosing good or bad, focus on the problem instead, simpler is always better.
3. Use the [SLSA](https://slsa.dev/spec/v1.0/threats-overview) framework to understand modern software supply chain threats and working to adopt defined security levels, a step at a time.
4. Automate dependencies management using OSS tool like [RenovateBot](https://github.com/renovatebot/renovate), it’s nice and easy to integrate.
5. Embrace the new era of artifact signing using [Sigstore](https://www.sigstore.dev/) and [SLSA attestations](https://slsa.dev/attestation-model) to produce your artifacts and as a guide to choosing third-party software that adopts it.
6. Always produce Software Bill of Material (SBOM) for an artifact and pretend to have it too from your suppliers. ([SPDX](https://spdx.dev/) and [CycloneDX](https://cyclonedx.org/) standards)
7. Automate and scan for known vulnerabilities across all your entire set of dependencies, it is easy to do it when standardising the artifacts to OCI containers. Using a tool like [Grype](https://github.com/anchore/grype).
8. Use smaller Docker images like [Distroless](https://github.com/GoogleContainerTools/distroless) or [Chainguard](https://www.chainguard.dev/chainguard-images) when possible

Thanks for reading this post. If you notice any errors or would like to discuss topics further, please get in touch with me through the [usual channels](/about). You can also join the conversation on this [Github discussion thread](https://github.com/paolomainardi/paolomainardi.com/discussions/23).
