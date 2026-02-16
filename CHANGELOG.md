# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0](https://github.com/AshExplained/ace-agentic-code-experience/compare/ace-experience-v0.2.1...ace-experience-v0.3.0) (2026-02-16)


### Added

* **05.01:** create ace-designer agent prompt file ([00e9dc0](https://github.com/AshExplained/ace-agentic-code-experience/commit/00e9dc0bd454d28571372ba7ae5296a16a056f6e))
* **05.02:** create ace-design-reviewer agent prompt file ([733d45d](https://github.com/AshExplained/ace-agentic-code-experience/commit/733d45d8e471a97598414d04644cf0bd29234f2b))
* **06.01:** insert handle_design step and update model lookup table ([54b55b7](https://github.com/AshExplained/ace-agentic-code-experience/commit/54b55b7b140500f03687187dcce2b16a93794369))
* **06.01:** sync source horsepower-profiles with installed version ([fa4e17c](https://github.com/AshExplained/ace-agentic-code-experience/commit/fa4e17c9a30184447eaf516e67cf9114225cc39e))
* **06.02:** extend read_context_files and spawn_architect with design handoff ([c6c2a52](https://github.com/AshExplained/ace-agentic-code-experience/commit/c6c2a5298881ab877f51fee0d55a40be3125869e))
* **06.02:** update plan-stage command with design workflow references ([86cfe9c](https://github.com/AshExplained/ace-agentic-code-experience/commit/86cfe9c17b03e1ab99476e803657fbca38074b27))
* **06.03:** add design conformance step to auditor agent ([031b79c](https://github.com/AshExplained/ace-agentic-code-experience/commit/031b79c77f12a87ce1ca27168a22e0662a57affb))
* **08.01:** add create_stylekit_preview step to ace-designer agent ([7f1253c](https://github.com/AshExplained/ace-agentic-code-experience/commit/7f1253c791d263284be974c4b0c8399f9001d918))
* **08.02:** add filtered gate file lists and cross-platform auto-open ([1896980](https://github.com/AshExplained/ace-agentic-code-experience/commit/1896980f18593904d973cfa66b3054ac6d08986e))
* **08.02:** replace Pexels informational nudge with interactive prompt ([3e9a1d8](https://github.com/AshExplained/ace-agentic-code-experience/commit/3e9a1d85c20b1fdd036bdf94a3d08656bd92fec1))
* **08.03:** add stylekit-preview.html checks to design reviewer ([4e0351e](https://github.com/AshExplained/ace-agentic-code-experience/commit/4e0351e0b5cb604ea5a62a3984fd18be84790fbd))
* **09.01:** fix UI detection keyword lists for login/signup stages ([fd0e221](https://github.com/AshExplained/ace-agentic-code-experience/commit/fd0e221a766dcd90ac7c41573a799d513007abe9))
* **09.01:** merge auto-open into approval gate subsection ([eb4c9bc](https://github.com/AshExplained/ace-agentic-code-experience/commit/eb4c9bc7dfc19587b4da99a17675693bfdf27188))
* **10.01:** add phase parameter and cascading revision rule to ace-designer ([ed6beb8](https://github.com/AshExplained/ace-agentic-code-experience/commit/ed6beb86ba4ee825503bedff8f2e5dd4edf9828b))
* **10.01:** add phase-aware review scope to ace-design-reviewer ([a55a8b1](https://github.com/AshExplained/ace-agentic-code-experience/commit/a55a8b1b2dc050d4a06c6036f7012fd5ba174409))
* **10.02:** restructure handle_design into two-phase orchestration ([6b8f1dd](https://github.com/AshExplained/ace-agentic-code-experience/commit/6b8f1dda4c8fdd895a53dc3dd2dcf56d69c4bc86))
* **11.01:** expand create_stylekit_preview to 7+ sections with theme toggle ([829f1df](https://github.com/AshExplained/ace-agentic-code-experience/commit/829f1df23ee225a49c95e4eb616fd133e9cd384c))
* **11.01:** update reviewer checks and design-artifacts for 7+ preview sections ([3b08e3d](https://github.com/AshExplained/ace-agentic-code-experience/commit/3b08e3db825e4377a30cfeff3ad41645d5f23f34))
* **11.02:** add prototype interactivity checks to reviewer and patterns to design-artifacts ([0402711](https://github.com/AshExplained/ace-agentic-code-experience/commit/04027115449451019f43f7fbc8f5f07fc3360a01))
* **11.02:** add prototype interactivity requirements to designer render_prototypes step ([ab5093d](https://github.com/AshExplained/ace-agentic-code-experience/commit/ab5093d7f04cb48ca35e6a8b7e0530c9b137f5a4))
* **12.01:** add design interview subsection and AskUserQuestion to plan-stage ([c39aa1a](https://github.com/AshExplained/ace-agentic-code-experience/commit/c39aa1a8997981febe477176c4e3d0cba0b831e0))
* **12.01:** inject design preferences into Phase 1 spawn template and sync installed copy ([659710c](https://github.com/AshExplained/ace-agentic-code-experience/commit/659710ce319430e329699695827ea74af09e4fe0))
* **13.01:** add conditional 5th design mapper agent to map-codebase pipeline ([c48ea43](https://github.com/AshExplained/ace-agentic-code-experience/commit/c48ea4328180323adc2b26ec59e34ab6e128779f))
* **13.01:** create DESIGN.md template and add design focus area to mapper agent ([2d09292](https://github.com/AshExplained/ace-agentic-code-experience/commit/2d09292218869793cd3f9601cda8a8517db2e021))
* **13.02:** add three-way mode determination and translate checkpoint to plan-stage ([46f78ab](https://github.com/AshExplained/ace-agentic-code-experience/commit/46f78ab626d83ed3f78e3eaf22a4a063c56ea56a))
* **13.02:** add translate mode to designer and DESIGN.md loading to architect ([c6b0787](https://github.com/AshExplained/ace-agentic-code-experience/commit/c6b0787e8c2a80f7620c5759258f5a1f83d23431))
* **14.01:** move screen output paths to global .ace/design/screens/ in ace-designer ([53197db](https://github.com/AshExplained/ace-agentic-code-experience/commit/53197dbd68dd8792b9bb65c08a6d3541ffdddea4))
* **14.01:** update design-artifacts reference and auditor conformance paths ([2b62e8d](https://github.com/AshExplained/ace-agentic-code-experience/commit/2b62e8dc7bbd2e6b6bee644ee920d62b6d8c2ee7))
* **14.02:** update plan-stage Phase 2 to use global screen paths with new/modified scoping ([672ba9c](https://github.com/AshExplained/ace-agentic-code-experience/commit/672ba9c1b4b6c8b4441f874daa34bff0b6ec338d))
* **15.01:** add generate_implementation_guide step to plan-stage ([3145224](https://github.com/AshExplained/ace-agentic-code-experience/commit/314522450fcf2b9f12b7f27410c20fdfa0890ea0))
* **15.01:** add implementation guide schema and prototype-as-visual-spec to design-artifacts ([72d05a0](https://github.com/AshExplained/ace-agentic-code-experience/commit/72d05a0c4e178fdd0b12742d790a219abba96f35))
* **15.01:** update architect context with HTML prototypes and design-fidelity must_haves ([de8cc78](https://github.com/AshExplained/ace-agentic-code-experience/commit/de8cc781b9d3cc59d0df291970593b17e36c79c4))
* **15.02:** add design-aware execution guidance to ace-runner ([d8e407f](https://github.com/AshExplained/ace-agentic-code-experience/commit/d8e407f980a15bfbc7464033e64f28ad64396b2c))
* **15.02:** add design-fidelity awareness to ace-architect ([999b691](https://github.com/AshExplained/ace-agentic-code-experience/commit/999b691e5061235627f759f09ec1e40e3bdfa58d))
* **15.02:** strengthen auditor design conformance to two-tier system ([082b15c](https://github.com/AshExplained/ace-agentic-code-experience/commit/082b15c10b2da26c36cb20e28131849da4eedca2))
* v0.4.0 brownfield design support & fidelity pipeline ([7e8df50](https://github.com/AshExplained/ace-agentic-code-experience/commit/7e8df5042b1122ff0e59c49cff8ab262fbe2710e))


### Fixed

* **07.01:** update ace-design-reviewer to check for Tailwind v3 CDN ([643aa35](https://github.com/AshExplained/ace-agentic-code-experience/commit/643aa35260e6a4a78ef792333110234cf98ca32c))
* **07.01:** update ace-designer to use Tailwind v3 CDN with inline config ([e2593c1](https://github.com/AshExplained/ace-agentic-code-experience/commit/e2593c14eeb573170506e547c264e921c6f1dc7d))
* **07.02:** remove -before.html logic and update token schema summary in plan-stage ([c563902](https://github.com/AshExplained/ace-agentic-code-experience/commit/c5639024cc9426878c2bbca9cc0735f0eecb7209))
* **07.02:** replace [@theme](https://github.com/theme) CSS rules with :root approach in design-tokens reference ([570b9b9](https://github.com/AshExplained/ace-agentic-code-experience/commit/570b9b9f24819383a071f3ddaedcb8d384412c5a))
* **07.02:** replace v4 HTML boilerplate with v3 CDN and remove -before.html rule in design-artifacts ([4f76a23](https://github.com/AshExplained/ace-agentic-code-experience/commit/4f76a239c9eae811fccb26faca5df504ca000787))


### Documentation

* **08.03:** document stylekit-preview.html in design-artifacts reference ([24edaf6](https://github.com/AshExplained/ace-agentic-code-experience/commit/24edaf6851eff254a5bb1aadf13a56394650b4b2))

## [0.2.1](https://github.com/AshExplained/ace-agentic-code-experience/compare/ace-experience-v0.2.0...ace-experience-v0.2.1) (2026-02-13)


### Fixed

* gate skip and template normalization ([4f1ec2e](https://github.com/AshExplained/ace-agentic-code-experience/commit/4f1ec2eeeeaa8aba476106defc48cb1e14168ef0))
* normalize template filenames and naming convention to lowercase ([c461889](https://github.com/AshExplained/ace-agentic-code-experience/commit/c461889fd46ae121fdf9ee467a9ac826ff596219))
* prevent human verification gate from being silently skipped ([7abc90d](https://github.com/AshExplained/ace-agentic-code-experience/commit/7abc90d485b5427df9a15a1536a42495d84c3fc9))

## [0.2.0](https://github.com/AshExplained/ace-agentic-code-experience/compare/ace-experience-v0.1.0...ace-experience-v0.2.0) (2026-02-10)


### Added

* add 12 content-level checks to markdown validator ([04a200b](https://github.com/AshExplained/ace-agentic-code-experience/commit/04a200be615ca144907ebcebdf81f32f19d454f7))
* add debugging diagnostics and codebase intelligence capabilities ([1bce4e6](https://github.com/AshExplained/ace-agentic-code-experience/commit/1bce4e660856f55c6f79af218d868a5d316bfecb))
* add execution capabilities ([b8dffcd](https://github.com/AshExplained/ace-agentic-code-experience/commit/b8dffcd85ac3de357d454a159e1f9e2a8ac44ba2))
* add gradient logo and TTY-aware banner to installer ([67aa2e5](https://github.com/AshExplained/ace-agentic-code-experience/commit/67aa2e5f40f98938e91555b85c7e9d1f8c9b344d))
* add milestone audit and gap closure commands ([42095e7](https://github.com/AshExplained/ace-agentic-code-experience/commit/42095e71c58dce298f2fb354b7b5110d55fdeab9))
* add milestone completion and dash task capabilities ([ffb3177](https://github.com/AshExplained/ace-agentic-code-experience/commit/ffb31772a8b974c3e68fb70d663ad7d3f3fb1432))
* add milestone workflow and templates ([6724484](https://github.com/AshExplained/ace-agentic-code-experience/commit/6724484b12ec3e1d4e1a89a2b8144fce9b79735a))
* add planning capabilities ([adbb903](https://github.com/AshExplained/ace-agentic-code-experience/commit/adbb903913ef7d162a85efdd8af91822a4b49e8c))
* add project initialization and navigator agent ([93a1d42](https://github.com/AshExplained/ace-agentic-code-experience/commit/93a1d4247cca0b2ca620b96c36719618969cfacf))
* add research and scoping capabilities ([24c35ae](https://github.com/AshExplained/ace-agentic-code-experience/commit/24c35aee185bc30087a24445e5a46ee7753ca581))
* add session management capabilities ([ae4dbd8](https://github.com/AshExplained/ace-agentic-code-experience/commit/ae4dbd8774cc05b2b45e990248b9dd4e6f2f378d))
* add settings, profile switching, and help commands ([c99fd36](https://github.com/AshExplained/ace-agentic-code-experience/commit/c99fd3670c636b5194b45b1933464bbd43656ef5))
* add stage management commands ([ee4da58](https://github.com/AshExplained/ace-agentic-code-experience/commit/ee4da58e8bfd1ad0025986a30986e477cb8226c2))
* add status command ([829084a](https://github.com/AshExplained/ace-agentic-code-experience/commit/829084ae1998e6b5fc41fff4b8f1479dda7654bf))
* add todo management commands ([df091a3](https://github.com/AshExplained/ace-agentic-code-experience/commit/df091a356ab55e01417f9b7c19abc98baa8e3c88))
* add verification and audit capabilities ([92cc0cb](https://github.com/AshExplained/ace-agentic-code-experience/commit/92cc0cb34c2c697df3a470428e001d37413f53b7))
* first beta build ready for UAT ([2be5e6b](https://github.com/AshExplained/ace-agentic-code-experience/commit/2be5e6b87f7e33f2e36636879d1bacae26c7f391))


### Fixed

* align delegation test line counts with 500-line threshold ([70cce7f](https://github.com/AshExplained/ace-agentic-code-experience/commit/70cce7ff8ab7d063f6cae8f7c90882c7ad00a2dd))
* align terminology across agents, workflows, and templates ([b58f7f9](https://github.com/AshExplained/ace-agentic-code-experience/commit/b58f7f935c39e5b6676f61ddc93576b43747f1ac))
* **ci:** build hooks before dist sync check, pin CLA action to v2.6.1 ([ee4526b](https://github.com/AshExplained/ace-agentic-code-experience/commit/ee4526bb06daee47cbd4a2094cec78f2189405ab))
* **ci:** remove CLA job — deferred to Layer 3 (needs PAT, no external contributors yet) ([9f84590](https://github.com/AshExplained/ace-agentic-code-experience/commit/9f845908121ed6ba64ed918f1cc9fd421d1a3b75))
* rename recon terminology to research across entire codebase ([7f9768f](https://github.com/AshExplained/ace-agentic-code-experience/commit/7f9768f7f1c8c6ec628806f22474be4ab094d268))
* resolve 49 of 62 markdown validator warnings (62 → 13) ([666b307](https://github.com/AshExplained/ace-agentic-code-experience/commit/666b30722a27721ca0f14b90ab2d6eecefd70b48))
* resolve 52 markdown validation errors (39 validator bugs + 13 file fixes) ([a4b1570](https://github.com/AshExplained/ace-agentic-code-experience/commit/a4b157064c60a96ea3aad9cb1b73823bae7eb157))
* update installer for flat commands structure (ace.*.md) ([7a82856](https://github.com/AshExplained/ace-agentic-code-experience/commit/7a82856bc9e7acadebc9ae641b00fae329da3b0c))


### Changed

* extract workflows from 3 bloated commands ([2dd94c2](https://github.com/AshExplained/ace-agentic-code-experience/commit/2dd94c2021705e962e1db1067e1b3c025528479c))


### Documentation

* add ACE reference documentation ([b410a0f](https://github.com/AshExplained/ace-agentic-code-experience/commit/b410a0f9415c3a8fc7c3bf466d6ac4d79d37d139))
* add CLA and update security policy to use GitHub private reporting ([579f6b3](https://github.com/AshExplained/ace-agentic-code-experience/commit/579f6b315fe3b0b7173390cd7c47f18760b2ad91))
* add git integration reference ([b437b8d](https://github.com/AshExplained/ace-agentic-code-experience/commit/b437b8d6e44a892a6bb0d294464f3d5923999a1e))
* add prompt security review rules to AGENTS.md ([1cfbc38](https://github.com/AshExplained/ace-agentic-code-experience/commit/1cfbc3828ba76bea1176f3f5fa639d6aea836b34))
* fix ace.init → ace.start in README ([479b315](https://github.com/AshExplained/ace-agentic-code-experience/commit/479b3155b056faf2c18035369247a75b8fabb020))
* update workflow count 12 → 15 after skills refactor ([de8789e](https://github.com/AshExplained/ace-agentic-code-experience/commit/de8789e16286a6d400ea541297b154efdd2d7d3a))


### Tests

* add 144 unit/integration tests using Node built-in test runner ([e42d21a](https://github.com/AshExplained/ace-agentic-code-experience/commit/e42d21a30ab5d08c2a60db26ee1050de7ac3e6a4))

## [Unreleased]

## [0.1.0] - 2026-02-07

### Added
- 25 slash commands for stage-driven project execution
- 11 specialized agents (architect, runner, detective, auditor, and more)
- 15 reusable workflows
- Interactive installer supporting Claude Code, OpenCode, and Gemini
- State management via pulse.md, track.md, brief.md, specs.md
- Global and local install modes
- Pre-commit pipeline (ESLint, Prettier, Gitleaks, markdown validation)

[Unreleased]: https://github.com/AshExplained/ace-agentic-code-experience/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/AshExplained/ace-agentic-code-experience/releases/tag/v0.1.0
