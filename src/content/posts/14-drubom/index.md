+++
date = "2026-10-24T21:00:00+02:00"
title = "DruBOM: next generation supply chain security for Drupal"
slug = "drubom-next-gen-drupal-supply-chain-security"
tags = ["ai", "agents", "drupal", "supply-chain", "security", "sbom"]
draft = "false"
toc = true
featuredImage = "/images/posts/14-drubom/overview.webp"
images = ["/images/posts/14-drubom/overview.webp"]
+++

{{< notice note >}}
This post was drafted with AI from my notes and answers. I reviewed and edited every line, and the opinions are mine. The software it describes was written by AI agents too, which is the point of the post.
{{< /notice >}}

## TL;DR

**[DruBOM](https://www.drupal.org/project/drubom)**, the Drupal module I created in 2023 to build a **software bill of materials** (SBOM), was almost abandoned. Between a Saturday morning and a Monday afternoon, AI agents rewrote it from scratch: no external binaries, an **SPDX 3.0.1** export, vulnerability checks, **VEX** decisions and a new admin interface. I steered, tested and decided every merge; the agents wrote the code. It is out as [1.0.0-beta2](https://www.drupal.org/project/drubom/releases/1.0.0-beta2).

## Introduction

DruBOM started in October 2023 and got its last round of work at the Drupal Contribution Weekend in January 2024, when we [wrote about it](https://tech.sparkfabrik.com/en/blog/drubom/) on the SparkFabrik tech blog. The idea was simple: give a Drupal site a list of everything it is built from. Then, like many side projects, it stopped there.

I picked it up again on a Saturday morning at Prague airport, flying home from [Open Source Summit Europe](https://events.linuxfoundation.org/open-source-summit-europe/). The day before, I had listened to Linus Torvalds [talking about AI](https://www.thestack.technology/ai-coding-gateway-drug-linus-torvalds/) with Dirk Hohndel: a "wonderful gateway drug" that is "on the whole improving our codebase", even while it is "stressing maintainers out to the point that it's a problem".

I went back to it because **software supply chain security** is more important than ever. I have been writing about it since 2023, on this blog with ["Have we reached a point of no return on managing software dependencies?"](/posts/point-of-no-return-on-managing-software-dependencies/) and for the OpenSSF with ["The Rising Threat of Software Supply Chain Attacks"](https://openssf.org/blog/2023/08/18/the-rising-threat-of-software-supply-chain-attacks-managing-dependencies-of-open-source-projects/). Now the models are now very good at finding vulnerabilities and writing exploits. The days right after beta2 shipped made the point for me, as Drew Silcock collected in ["Is this the new cyber normal?"](https://drew.silcock.dev/blog/is-this-the-new-cyber-normal/):

- **PHP**: a remote code execution in PHP itself, [PHP2Shell](https://www.php.net/archive/2026.php#2026-10-20-1), that [AWS saw exploited](https://aws.amazon.com/blogs/security/amazon-threat-intelligence-identifies-php2shell-exploitation-prior-to-public-disclosure-in-madpot/) before it was disclosed.
- **Certificates**: the eMudhra intermediate CA keys turned out to be weak enough to recover, and [Mozilla blocked them](https://blog.mozilla.org/security/2026/10/20/protecting-firefox-users-following-the-compromise-of-emudhra-intermediate-certificates/).
- **GitLab**: two maximum severity remote code executions in nine days, fixed in [19.4.2](https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-4-2-released/) and [19.5.1](https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-5-1-released/).
- **LiteLLM**: a [compromised release](https://docs.litellm.ai/blog/security-incident-oct-21-2026) on PyPI and Docker Hub, stealing credentials.

Things did not get better since 2023. The first question after a week like this is always the same: _are we affected?_ You cannot answer it without knowing what your site is made of.

I also had a second reason. I wanted to see how far the current models can go when they have to write complex software from scratch, not patch a few files.

So the goal was simple: a module that runs on any PHP hosting with nothing else to install, built from scratch by the agents.

## Where DruBOM was

The 2024 version did one thing: it called **[Syft](https://github.com/anchore/syft)**, a Go binary from Anchore that had to be installed on the server, and stored its output. The admin page showed a count of packages per type and a wall of raw JSON.

{{< figure src="/images/posts/14-drubom/before-2024.webp" caption="The 2024 admin page: a count of packages per type and a wall of raw JSON. It worked, but nobody would read it." >}}

The first review of the old code found worse problems than the looks:

- **Broken on Drupal 11**: the settings form failed at class loading.
- **Grype half done**: the vulnerability scan with [Grype](https://github.com/anchore/grype), another Go binary, passed the wrong object type and leaked temporary directories.
- **A shell injection risk**: configuration values and file names reached the command line.

## The decisions

These were mine, taken in the first half hour of the session, with the agents proposing the options and the trade-offs:

- **No external binaries.** Syft and Grype are gone. The inventory and the advisory checks are native PHP, so the module works on any PHP hosting, with nothing else to install.
- **A full inventory.** Composer packages, Drupal modules and themes, asset libraries, and npm, Yarn and pnpm packages. What cannot be read is listed as a coverage gap, never hidden.
- **One standard, behind an abstraction.** The data lives in a format agnostic model, and formatters are Drupal plugins. [SPDX 3.0.1](https://spdx.dev/) is the only one shipped today; CycloneDX can plug in later.
- **Network calls are opt in.** Advisories come from [drupal.org](https://www.drupal.org/security), the [Packagist](https://packagist.org/) advisory database and [OSV.dev](https://osv.dev/), with the [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) and [ENISA EUVD](https://euvd.enisa.europa.eu/) catalogs flagging what attackers are already using. Packages from private repositories and registries are left out of every lookup.
- **Decisions on findings.** A finding is not a verdict. VEX (Vulnerability Exploitability eXchange) records whether the site is really affected, with a reason, a review date and a history, and the decision goes into the export.
- **Drupal 11.3 and Drupal 12 only**, with the newer Drupal APIs: object oriented hooks, htmx and autowiring.

## How the work was split

On day one I told the main agent: _"You are in charge now, you steer the implementation, test it and review it, come back to me only for important blocking questions."_

As I wrote in [my previous post](/posts/the-stack-is-now-my-agents-job/), writing code today is no longer writing and checking it line by line. The models write good, high quality code when they have a good harness around them and a full CI pipeline that measures what they do. I am not alone in thinking this. Andrej Karpathy calls it [agentic engineering](https://x.com/karpathy/status/2019137879310836075): _"you are not writing the code directly 99% of the time"_, but _"there is an art & science and expertise to it"_. OpenAI described a product built with no hand written code at all in [Harness engineering](https://openai.com/index/harness-engineering), and Simon Willison collects the practices that make it work in [Agentic Engineering Patterns](https://simonwillison.net/guides/agentic-engineering-patterns/).

The team looked like this:

- **A lead agent** planned the work, wrote the briefs, reviewed every change, tested it in a browser and pushed it.
- **A second agent, from a different vendor,** implemented most of the features from about forty written briefs, and ran five **unsteered reviews** of the whole codebase. They talked to each other through [herdr](https://herdr.dev/), the terminal multiplexer I use for agents.
- **Short lived subagents** for focused jobs: a fresh code review, a Drupal naming judge, a UI and UX designer.
- **Me**, deciding scope, looking at every screen, and merging.

I find it very interesting how models from different vendors spot different things. It is like putting together teams with different experiences. A concrete example: three of the five reviews each found a different way private npm package names could still reach OSV.dev. Each one was fixed, with a test, before the next review.

## The interface

Interfaces have always been an issue for me. I love a well made one, but I never invested in building them, so this was also a test of the design skills of these models. They are impressive.

The overview went through eight mockups before I said _"v8 is the one"_. In between, a UI designer subagent proposed layouts, I pushed back (I wanted the big coloured bar back, the buttons above the fold, less information on screen), and the two agents judged each version before implementing it.

{{< figure src="/images/posts/14-drubom/overview.webp" caption="The overview in beta2: open findings first, the known exploited one on top, and every package in one coloured bar." >}}

Then I asked for a _wow_ effect: a map that shows which Drupal project brings in each package. The agents built it on plain **WebGL**, with no graph library, so it ships inside the module with nothing to download. The map moves gently when idle, and clicking a package explains why it is there.

{{< figure src="/images/posts/14-drubom/dependency-map-overview.webp" caption="The dependency map of one of our Drupal distributions: 2,026 packages and 6,688 links, drawn in the browser." >}}

The less flashy parts got the same attention: plain language help on every page, a Terms tab for the jargon, and a decision form that says what each choice means.

{{< figure src="/images/posts/14-drubom/assess.webp" caption="Assessing a finding. Each option explains itself, and a known exploited vulnerability says so before you choose." >}}

## The harness

None of this works without guardrails. These are the ones that kept the agents honest:

- **Tests first.** 44 test classes and 231 test methods, unit, kernel, functional and browser. A fix for a regression comes with a test that fails without it.
- **The full drupal.org CI** on every change: coding standards, static analysis, PHPUnit on Drupal 11 and 12, and validation of the SPDX output against the official schema.
- **Real sites.** Two of our clients' Drupal sites, run locally, with the Claro and Gin admin themes. Many of the bugs only showed up there.
- **An independent reviewer**, from a different vendor, before merging.
- **A human for every merge and every release.**

Was there anything that did not work? Honestly, nothing worth a section. It was a normal development process: plan, build, review, test, fix, release. Just squeezed into a bunch of hours instead of weeks.

| | 2024 | 1.0.0-beta2 |
|---|---|---|
| Files | 32 | 302 |
| Tests | 0 | 231 methods in 44 classes |
| External binaries | Syft, Grype | none |
| Export format | CycloneDX JSON, through Syft | SPDX 3.0.1, pluggable |
| Drupal | 10.2 and later (declared up to 11) | 11.3 and 12 |

From the 2024 code to beta2: 34,126 lines added and 2,213 removed, across 309 files. The rewrite landed as [merge request !12](https://git.drupalcode.org/project/drubom/-/merge_requests/12), 1.0.0-beta1 shipped on Sunday, and beta2, with the map and the new overview, on Monday.

## Takeaways

The next step for DruBOM is a stable release, once the feedback from the community and from our own sites comes in. What I take away is bigger than the module.

1. **Supply chain security is still a danger, now more than ever.** Models find vulnerabilities and write exploits faster than we patch. Knowing what you run is the minimum.
2. **Models can build almost any idea.** They are now at a level where anyone has an entire team at hand.
3. **Ideas are worth more.** Every developer should invest here: put your expertise no longer into code, but into the higher level, more abstract ideas of a product.
4. **We should think bigger.** As developers we can now build much bigger and more complex products than before. We are no longer limited by our own vertical knowledge, be it systems, backend, frontend or design.

If you run Drupal, try [DruBOM](https://www.drupal.org/project/drubom) and tell me what breaks. If you have questions or just want to talk about agents and supply chain security, just drop me a message [here](https://github.com/paolomainardi/paolomainardi.com/discussions).
