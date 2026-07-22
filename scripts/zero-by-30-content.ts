/**
 * "Zero by 30: Eliminating Rabies Worldwide by 2030" — course content.
 *
 * Sourced from a 26-slide awareness deck by CCC (Compassionate Canine
 * Communities) in collaboration with the WHO/OIE/FAO/GARC Zero-by-30
 * campaign. Content structured into 4 lessons / 25 learner pages using
 * Akhila's built-in page templates.
 */

import type { PageContentV1 } from "@/lib/page-builder/types";

export const COURSE_META = {
  title: "Zero by 30: Eliminating Rabies Worldwide by 2030",
  description:
    "A community awareness course on rabies prevention, vaccination, and bite avoidance — built from the WHO/OIE/FAO/GARC Zero by 30 campaign in partnership with Compassionate Canine Communities (CCC).",
  manifestDescription:
    "Sample course exploring rabies prevention, pre- and post-exposure prophylaxis, herd immunity, and safe interactions with dogs. Ideal for community volunteers, veterinary teams, and public-health educators.",
  estimatedDurationMinutes: 25,
} as const;

type LessonSeed = {
  title: string;
  pages: {
    title: string;
    content: PageContentV1;
  }[];
};

// ---------------------------------------------------------------------------
// Tiny HTML helpers (all output is sanitized by the rich-text renderer).
// ---------------------------------------------------------------------------
const p = (text: string) => `<p>${text}</p>`;
const strong = (text: string) => `<strong>${text}</strong>`;
const ul = (items: string[]) =>
  `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const ol = (items: string[]) =>
  `<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
const h3 = (text: string) => `<h3>${text}</h3>`;
const block = (...parts: string[]) => parts.join("");

// ---------------------------------------------------------------------------
// Lesson 1 — Introduction
// ---------------------------------------------------------------------------
const LESSON_INTRO: LessonSeed = {
  title: "Introduction",
  pages: [
    {
      title: "Welcome to Zero by 30",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Zero by 30: Eliminating Rabies Worldwide by 2030"),
          p(
            "Rabies is a 100% vaccine-preventable disease — yet tens of thousands of people still die from it every year, mostly from dog bites. The global Zero by 30 initiative aims to eliminate human deaths from dog-mediated rabies by 2030.",
          ),
          p(
            `This awareness course was built with heartfelt thanks to the ${strong("World Health Organization (WHO)")}, the ${strong("Global Alliance for Rabies Control (GARC)")}, and partner sites for the information and imagery they make openly available to communities like ours.`,
          ),
          p(
            `Presented by ${strong("Compassionate Canine Communities (CCC)")} — Pune city joins the movement.`,
          ),
        ),
      },
    },
    {
      title: "Course outline",
      content: {
        v: 1,
        template: "text",
        body: block(
          p("In this short course you will learn about:"),
          ol([
            strong("What is rabies?") +
              " — the virus, how it spreads, and why it matters.",
            strong("Rabies vaccines") +
              " — pre-exposure and post-exposure prophylaxis.",
            strong("Protection from rabies") +
              " — practical steps for you, your pets, and strays in your community.",
            strong("Herd immunity") +
              " — why vaccinating 70% of dogs breaks transmission.",
            strong("Dog bite prevention") +
              " — how to behave around pet and stray dogs.",
          ]),
          p(
            "Each lesson is short. Move at your own pace using the outline on the left.",
          ),
        ),
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Lesson 2 — Understanding Rabies
// ---------------------------------------------------------------------------
const LESSON_UNDERSTANDING: LessonSeed = {
  title: "Understanding Rabies",
  pages: [
    {
      title: "What is rabies?",
      content: {
        v: 1,
        template: "text",
        body: block(
          p(
            `${strong("Rabies")} is a 100% vaccine-preventable viral disease which occurs in more than 150 countries and territories.`,
          ),
          p(
            "The rabies virus can infect most mammals. Animals like frogs, birds, and snakes do not get rabies.",
          ),
          p("Rabies can be prevented through:"),
          ul([
            strong("Vaccination") + " of stray and pet dogs.",
            strong("Prevention") + " of dog bites.",
          ]),
          p(
            "You can get rabies when an animal with rabies bites you. Once symptoms develop, there is still no treatment available — which is why prevention is everything.",
          ),
        ),
      },
    },
    {
      title: "How rabies can be eliminated",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Rabies can be eliminated by…"),
          ul([
            strong("Preventing dog bites") +
              " — learn how to behave around dogs.",
            strong("Taking anti-rabies vaccination") +
              " — for pets, strays, and people at risk.",
            "If you are bitten, " +
              strong("wash the wound with soap and running water for 15 minutes") +
              " and seek medical help immediately.",
            "Vaccinate pet and stray dogs regularly — the single best way to stop rabies from spreading.",
          ]),
        ),
      },
    },
    {
      title: "The Zero by 30 initiative",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Global initiative — WHO, OIE, FAO and GARC"),
          p(
            "The Zero by 30 programme aims at eliminating human deaths from rabies by 2030. Rabies is one of the oldest diseases known to humans and remains a serious public-health threat in many countries across Africa and Asia.",
          ),
          p(
            strong("There is still no treatment available") +
              " once a patient develops the symptoms of rabies.",
          ),
          p(
            strong("Rabies elimination is possible") +
              " — the time to act is now.",
          ),
        ),
      },
    },
    {
      title: "The rabies virus",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("A neurotropic virus that attacks the nervous system"),
          ul([
            "Rabies virus (scientific name " +
              strong("Rabies lyssavirus") +
              ") is a neurotropic virus — it infects nerve tissue and causes rabies in humans and animals.",
            "It is caused by RNA viruses in the family " +
              strong("Rhabdoviridae") +
              " and the genus " +
              strong("Lyssavirus") +
              ".",
            "Transmission occurs through the saliva of infected animals, and less commonly through contact with human saliva.",
            "The virus enters your body through an animal bite and attacks the central nervous system, leading to a painful death.",
          ]),
          p(
            strong("July 6th, 1885.") +
              " Joseph Meister becomes the first person to receive Louis Pasteur's rabies vaccine — a turning point in modern medicine.",
          ),
        ),
      },
    },
    {
      title: "Immediate actions — Do's and Don'ts",
      content: {
        v: 1,
        template: "two_column",
        left: block(
          h3("Do — if you are bitten or scratched"),
          ul([
            "Wash the wound immediately with soap or detergent.",
            "Flush the wound thoroughly for about 15 minutes with running water.",
            "Apply an iodine-containing or anti-viral medication 15 minutes after washing.",
            "Seek transportation to a health-care facility for further assessment and to start the anti-rabies vaccine course.",
          ]),
        ),
        right: block(
          h3("Don't — avoid these"),
          ul([
            "Apply irritants to the wound (chilli powder, plant juices, acids, alkalis).",
            "Cover the wound with dressings or bandages.",
            "Delay seeking medical help — even if the wound appears minor.",
            "Try to capture or handle the animal that bit you.",
          ]),
        ),
      },
    },
    {
      title: "Pre-exposure prophylaxis (PrEP)",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("PrEP — vaccination before exposure"),
          p(
            "Pre-exposure prophylaxis " +
              strong("shortens, but does not replace") +
              ", post-exposure treatment.",
          ),
          h3("Who should consider PrEP?"),
          ul([
            "Communities in remote, highly endemic settings with limited access to proper PEP.",
            "Individuals at occupational risk (veterinary workers, animal handlers, lab staff).",
            "Travellers to remote endemic settings with limited access to PEP.",
          ]),
          h3("The schedule"),
          p(
            "PrEP consists of vaccination on " +
              strong("day 0, day 7 and day 14") +
              ". Having already received ≥2 doses of rabies vaccine (e.g. as PEP for a previous exposure) at some point in life counts as PrEP.",
          ),
          p(
            strong("Important:") +
              " even if you have completed PrEP, you must still seek medical attention after any suspected exposure.",
          ),
        ),
      },
    },
    {
      title: "Post-exposure prophylaxis (PEP)",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("What is PEP?"),
          p(
            "Post-exposure prophylaxis (PEP) is the treatment protocol used after a person may have been exposed to the rabies virus through an animal bite or scratch — or any situation where transmission is possible.",
          ),
          h3("Four pillars of PEP"),
          ul([
            strong("Promptness") +
              " — PEP should be initiated as soon as possible after potential exposure, ideally within 24 hours.",
            strong("Wound care") +
              " — wash the wound thoroughly with soap and water for at least 15 minutes.",
            strong("Vaccination") +
              " — day 0 first dose, then day 3, day 7, day 14, and day 21 or 28. Number of doses depends on the vaccine used.",
            strong("Rabies immune globulin (RIG)") +
              " — provides immediate passive immunity while the vaccine takes effect. Typically given on the day of exposure.",
          ]),
        ),
      },
    },
    {
      title: "PEP requires vaccines and immunoglobulin",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("What PEP looks like by exposure category"),
          p(
            "The following treatment is recommended when the risk assessment considers PEP appropriate. Transmission is possible only through contact with a rabid animal — the vaccination is a form of prevention because there is no cure for rabies.",
          ),
          ul([
            strong("Category I") + " — wound washing only.",
            strong("Category II") +
              " (and people with PrEP) — wound washing " +
              strong("+") +
              " rabies vaccine.",
            strong("Category III") +
              " — wound washing " +
              strong("+") +
              " rabies vaccine " +
              strong("+") +
              " rabies immunoglobulin (RIG).",
          ]),
          p(
            "When deemed necessary by an appropriate risk assessment, PEP should start as soon as possible.",
          ),
        ),
      },
    },
    {
      title: "Wound categories",
      content: {
        v: 1,
        template: "tabs",
        layout: "horizontal",
        tabs: [
          {
            id: "cat-1",
            label: "Category I — no exposure",
            body: block(
              p("Contact that does not require post-exposure treatment:"),
              ul([
                "Animal licks on intact skin.",
                "Touching animals.",
                "Feeding animals.",
              ]),
            ),
            imageUrl: "",
            imageAlt: "",
          },
          {
            id: "cat-2",
            label: "Category II",
            body: block(
              p("Requires wound washing + rabies vaccine:"),
              ul([
                "Minor scratches or abrasions without bleeding.",
                "Nibbling of uncovered skin.",
              ]),
              p(
                strong("Never ignore") +
                  " minor scratches from an animal suspected to have rabies.",
              ),
            ),
            imageUrl: "",
            imageAlt: "",
          },
          {
            id: "cat-3",
            label: "Category III",
            body: block(
              p(
                "Highest risk — requires wound washing + rabies vaccine + rabies immunoglobulin (RIG):",
              ),
              ul([
                "Single or multiple transdermal bites or scratches.",
                "Contamination of mucous membrane or broken skin with saliva.",
                "Contact with rabid animals — including bats, rats, and dogs.",
              ]),
              p(
                strong("Remember:") +
                  " the closer to the brain the exposure occurs, the faster the virus reaches the brain.",
              ),
            ),
            imageUrl: "",
            imageAlt: "",
          },
        ],
      },
    },
    {
      title: "What is HRIG (or RIG)?",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Immediate protection while the vaccine takes effect"),
          p(
            "Human Rabies Immunoglobulin (HRIG) provides ready-made antibodies against the rabies virus — instant protection while the vaccine stimulates your body's own immune response.",
          ),
          ul([
            strong("Administration") +
              " — usually a single dose calculated by weight and exposure severity, given as soon as possible after exposure (ideally with the first vaccine dose).",
            strong("Injection site") +
              " — if possible, injected sub-dermally into the tissue around the wound to give localized protection. Any remaining HRIG is given intramuscularly (e.g. into the deltoid muscle).",
            strong("Combination with vaccine") +
              " — HRIG is typically given alongside the rabies vaccine. The vaccine trains your immune system to produce its own antibodies for long-term protection.",
          ]),
          p(
            strong("Why it matters:") +
              " HRIG offers immediate protection while the rabies vaccine takes time to stimulate your response. The combination is a comprehensive defence against rabies.",
          ),
        ),
      },
    },
    {
      title: "How to protect yourself from rabies",
      content: {
        v: 1,
        template: "accordion",
        items: [
          {
            id: "protect-1",
            title: "Vaccinate pet and stray dogs",
            body: p(
              "Ensure your pets — dogs and cats — receive regular rabies vaccinations. And where possible, help ensure stray dogs and cats in your neighbourhood are also vaccinated.",
            ),
          },
          {
            id: "protect-2",
            title: "Pet and stray animal management",
            body: p(
              "Spaying and neutering programmes for stray and pet dogs, combined with responsible pet-ownership practices, help control the stray population and prevent the spread of rabies.",
            ),
          },
          {
            id: "protect-3",
            title: "Public awareness and education",
            body: p(
              "Avoid contact with stray animals. Seek prompt medical attention after any animal bite or scratch. Educate people about the importance of vaccinating their pets — and teach children to avoid unfamiliar strays.",
            ),
          },
          {
            id: "protect-4",
            title: "Secure your garbage",
            body: p(
              "Proper waste disposal discourages stray and wild-animal scavenging around homes and public spaces.",
            ),
          },
        ],
      },
    },
    {
      title: "Pre- and post-exposure vaccines",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Two layers of human protection"),
          h3("Pre-exposure vaccination"),
          p(
            "A course of rabies vaccination given " +
              strong("before") +
              " any exposure. Does not include rabies immunoglobulin (RIG). Recommended for veterinary workers, animal handlers, and individuals in high-risk professions.",
          ),
          h3("Post-exposure protection"),
          p(
            "Administration of rabies immunoglobulin " +
              strong("and") +
              " a series of rabies vaccine doses to individuals who have been bitten or scratched by a suspected rabid animal.",
          ),
        ),
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Lesson 3 — Rabies Prevention
// ---------------------------------------------------------------------------
const LESSON_PREVENTION: LessonSeed = {
  title: "Rabies Prevention",
  pages: [
    {
      title: "How to avoid being bitten by a dog",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("A few simple rules"),
          ul([
            "Keep away from dogs you don't know.",
            "Don't chase, hit, kick, or shout at dogs.",
            "Keep away from dogs that behave strangely — they may bite.",
            "Don't interfere with dogs that are eating, sleeping, or have puppies.",
          ]),
          p(
            strong("If you are bitten by a dog") +
              " — wash the wound and go to your clinic immediately.",
          ),
        ),
      },
    },
    {
      title: "Managing the biting animal",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("WHO guidelines"),
          ul([
            "If possible, safely confine the biting animal.",
            "Collect information about the animal and the bite circumstances — pass it on to the health-care professional and the public-health officer or municipal-corporation officials.",
            "Keep the animal confined and under observation for " +
              strong("10 days") +
              ". If it survives, it did not have rabies at the time of the bite and the people bitten are safe.",
          ]),
          p(
            strong("Important:") +
              " people bitten should still complete their anti-rabies vaccination course.",
          ),
        ),
      },
    },
    {
      title: "Herd immunity through vaccination",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Why vaccinating dogs protects everyone"),
          p(
            "Anti-rabies vaccination of dogs plays a crucial role in establishing " +
              strong("herd immunity") +
              " against rabies within canine populations.",
          ),
          p(
            "When a large percentage of dogs in a community are immunised, the likelihood of an outbreak or sustained transmission of the virus decreases significantly.",
          ),
          ul([
            "Vaccinated dogs are protected from the disease, reducing the pool of potential carriers.",
            "They also act as barriers — preventing the virus from spreading to susceptible individuals.",
            "This interruption of transmission limits the opportunities for rabies to pass from one dog to another, and consequently to humans.",
          ]),
        ),
      },
    },
    {
      title: "The 70% vaccination target",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Vaccinating 70% of dogs breaks rabies transmission"),
          ul([
            strong("99%") +
              " of human rabies cases are transmitted by dogs.",
            "Stopping rabies in dogs is important because it stops transmission to people.",
            "Dog vaccination is the " +
              strong("most cost-effective") +
              " way to prevent rabies.",
            "Vaccinating " +
              strong("70% of the susceptible dog population") +
              " stops transmission.",
          ]),
          p(
            "Herd immunity focuses on dogs that potentially interact — unsupervised — with a rabid dog. Break that chain and rabies has nowhere to go.",
          ),
        ),
      },
    },
    {
      title: "Bite prevention — pet dogs (part 1)",
      content: {
        v: 1,
        template: "accordion",
        items: [
          {
            id: "pet-1",
            title: "Choose the right dog for you",
            body: p(
              "Match the breed, temperament, and energy level to your family, home, and lifestyle. A mismatched dog is a stressed dog — and stressed dogs bite.",
            ),
          },
          {
            id: "pet-2",
            title: "Socialisation",
            body: p(
              "Expose puppies to new people, animals, sights, and sounds early, so they grow up confident rather than fearful.",
            ),
          },
          {
            id: "pet-3",
            title: "Training",
            body: p(
              "Consistent, positive-reinforcement training builds a dog that responds reliably to you — even in unfamiliar situations.",
            ),
          },
          {
            id: "pet-4",
            title: "Supervision",
            body: p(
              "Never leave young children alone with a dog. Most bites to children happen at home, with a familiar dog, when no adult is watching.",
            ),
          },
          {
            id: "pet-5",
            title: "Recognise warning signs",
            body: p(
              "Growling, snapping, whale eye, stiff body, raised hackles — a dog signals before it bites. Learn the signals and respect them.",
            ),
          },
          {
            id: "pet-6",
            title: "Respect personal space",
            body: p(
              "Give dogs their own quiet zone (a bed, a crate, a corner). Teach children not to disturb dogs that are resting or eating.",
            ),
          },
        ],
      },
    },
    {
      title: "Bite prevention — pet dogs (part 2)",
      content: {
        v: 1,
        template: "accordion",
        items: [
          {
            id: "pet-7",
            title: "Ask for permission",
            body: p(
              "Before approaching or petting an unfamiliar dog, always ask the owner first — and let the dog approach you if it wants to.",
            ),
          },
          {
            id: "pet-8",
            title: "Healthcare",
            body: p(
              "A dog in pain — from ear infections, arthritis, dental issues — is more likely to snap. Keep vaccinations and veterinary check-ups up to date.",
            ),
          },
          {
            id: "pet-9",
            title: "Leash and containment",
            body: p(
              "Use a leash in public spaces and ensure your yard or terrace is secure. A wandering dog is a bite waiting to happen.",
            ),
          },
          {
            id: "pet-10",
            title: "Spay / neuter",
            body: p(
              "Sterilisation reduces roaming, fighting, and hormonal aggression — and helps control the stray-dog population too.",
            ),
          },
          {
            id: "pet-11",
            title: "Safe play",
            body: p(
              "Avoid rough games like tug-of-war or wrestling that reward biting. Use toys, fetch, and puzzle games instead.",
            ),
          },
          {
            id: "pet-12",
            title: "Avoid dominance techniques",
            body: p(
              "Alpha rolls, harsh corrections, and punishment-based training increase fear and aggression. Reward-based training works better.",
            ),
          },
          {
            id: "pet-13",
            title: "Consult professionals",
            body: p(
              "If your dog shows aggression, growling, or fear-biting — talk to a qualified veterinary behaviourist. Don't wait for a serious incident.",
            ),
          },
        ],
      },
    },
    {
      title: "Bite prevention — stray dogs (part 1)",
      content: {
        v: 1,
        template: "accordion",
        items: [
          {
            id: "stray-1",
            title: "Stay calm",
            body: p(
              "Panic makes a nervous dog more nervous. Breathe slowly. Speak quietly, if at all.",
            ),
          },
          {
            id: "stray-2",
            title: "Avoid direct eye contact",
            body: p(
              "In dog language, sustained eye contact is a challenge. Look at the ground or slightly to the side.",
            ),
          },
          {
            id: "stray-3",
            title: "Stand still",
            body: p(
              "Turn sideways, keep your arms close to your body, and become boring. Most stray dogs will lose interest and move on.",
            ),
          },
          {
            id: "stray-4",
            title: "Do not run",
            body: p(
              "Running triggers a chase response — even in dogs that would otherwise ignore you.",
            ),
          },
          {
            id: "stray-5",
            title: "Avoid high-pitched noises",
            body: p(
              "Screaming or squealing can excite dogs. Keep your voice low and steady if you need to speak.",
            ),
          },
          {
            id: "stray-6",
            title: "Don't put your face close to a dog's face",
            body: p(
              "This is especially important for children. A face close to a dog's face is easily misread as a threat.",
            ),
          },
        ],
      },
    },
    {
      title: "Bite prevention — stray dogs (part 2)",
      content: {
        v: 1,
        template: "accordion",
        items: [
          {
            id: "stray-7",
            title: "Protect your body",
            body: p(
              "If a dog does attack, protect your neck, face, and hands. Curl into a ball and use a jacket or bag as a shield.",
            ),
          },
          {
            id: "stray-8",
            title: "Keep distance",
            body: p(
              "Give strays a wide berth on the street. Cross the road if you need to — pets don't have to be far away, but strangers should be.",
            ),
          },
          {
            id: "stray-9",
            title: "Don't approach",
            body: p(
              "Don't pet, feed, or corner a stray dog unless you know it well. Even friendly strays can bite when startled.",
            ),
          },
          {
            id: "stray-10",
            title: "Carry treats (optional)",
            body: p(
              "If you regularly walk in areas with strays, carrying a few biscuits can help you defuse a tense moment by tossing one away from yourself.",
            ),
          },
          {
            id: "stray-11",
            title: "Educate children",
            body: p(
              "Teach children the same rules: no eye contact, no running, no touching strays. Practise the 'be a tree' pose at home.",
            ),
          },
        ],
      },
    },
    {
      title: "Can killing dogs eliminate rabies?",
      content: {
        v: 1,
        template: "two_column",
        left: block(
          h3("No — culling does not work"),
          p("Indiscriminate dog culling is:"),
          ul([
            strong("Ineffective") +
              " — the dog population will eventually bounce back.",
            strong("Counterproductive") +
              " — vaccinated dogs can get killed.",
            strong("Risky") +
              " — people relocate their dogs, spreading potential exposure.",
            strong("Widely disapproved") +
              " — especially when conducted using inhumane methods.",
          ]),
        ),
        right: block(
          h3("Yes — mass sterilisation and vaccination works"),
          ul([
            "Controls canine rabies at the population level.",
            "Safeguards those who struggle to access post-exposure prophylaxis.",
            "Eliminates dog-mediated human rabies deaths.",
            "Protects livestock, and the livelihoods of rural communities that depend on them.",
          ]),
        ),
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Lesson 4 — Together we can
// ---------------------------------------------------------------------------
const LESSON_TOGETHER: LessonSeed = {
  title: "Together we can",
  pages: [
    {
      title: "Rabies elimination is possible",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Zero by Thirty — the goal is within reach"),
          p(
            "Together, we can achieve the Zero by Thirty goal to eliminate rabies from this planet.",
          ),
          p(
            "By taking preventive measures and acting promptly, we can protect ourselves and our communities from this deadly disease — and eliminate it forever.",
          ),
          p(
            strong("Vaccination, responsible pet ownership, and community awareness") +
              " are the three keys.",
          ),
        ),
      },
    },
    {
      title: "The CCC approach",
      content: {
        v: 1,
        template: "text",
        body: block(
          h3("Compassionate Canine Communities"),
          p(
            "At CCC we believe that stray-dog population management should be " +
              strong("humane and ethical") +
              " — minimising harm and maximising benefits for the dogs involved as well as the human communities that share their streets.",
          ),
          p(
            "Thank you for taking this course. Please share what you have learned with family, friends, and neighbours. Every conversation moves us closer to Zero by 30.",
          ),
        ),
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Exported course structure.
// ---------------------------------------------------------------------------
export const COURSE_CONTENT: readonly LessonSeed[] = [
  LESSON_INTRO,
  LESSON_UNDERSTANDING,
  LESSON_PREVENTION,
  LESSON_TOGETHER,
];
