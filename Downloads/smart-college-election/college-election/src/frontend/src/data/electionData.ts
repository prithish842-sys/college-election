import type { Candidate, Position } from "../types/election";

export const POSITIONS: Position[] = [
  {
    id: "chairman",
    title: "Chairman",
    description:
      "Overall head of the student body, responsible for representing all students and leading the executive council.",
    icon: "",
  },
  {
    id: "vice-chairman",
    title: "Vice Chairman",
    description:
      "Supports the Chairman in leadership duties and assumes responsibilities in their absence.",
    icon: " ",
  },
  {
    id: "secretary",
    title: "Secretary",
    description:
      "Manages official communications, meeting minutes, and administrative correspondence for the student council.",
    icon: " ",
  },
  {
    id: "treasurer",
    title: "Treasurer",
    description:
      "Oversees student council finances, budget planning, and transparent allocation of funds for campus events.",
    icon: " ",
  },
  {
    id: "sports-head",
    title: "Sports Head",
    description:
      "Coordinates all sports events, inter-college competitions, and promotes student athletic participation.",
    icon: " ",
  },
  {
    id: "cultural-head",
    title: "Cultural Head",
    description:
      "Leads cultural festivals, arts programs, and celebrations that enrich campus life and student creativity.",
    icon: " ­",
  },
  {
    id: "technical-lead",
    title: "Technical Lead",
    description:
      "Drives technical workshops, hackathons, and innovation initiatives to advance students' technological skills.",
    icon: " ",
  },
  {
    id: "class-representative",
    title: "Class Representative",
    description:
      "Voices classroom concerns to faculty and administration, bridging communication between students and staff.",
    icon: "",
  },
];

export const CANDIDATES: Candidate[] = [
  // Chairman
  {
    id: "c1",
    positionId: "chairman",
    name: "Arjun Mehta",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "c2",
    positionId: "chairman",
    name: "Priya Sharma",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "c3",
    positionId: "chairman",
    name: "Rahul Verma",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "c4",
    positionId: "chairman",
    name: "Sneha Patel",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "c5",
    positionId: "chairman",
    name: "Vikram Singh",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "c6",
    positionId: "chairman",
    name: "Ananya Krishnan",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "c7",
    positionId: "chairman",
    name: "Rohan Desai",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  // Vice Chairman
  {
    id: "vc1",
    positionId: "vice-chairman",
    name: "Kavya Nair",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "vc2",
    positionId: "vice-chairman",
    name: "Ishaan Gupta",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "vc3",
    positionId: "vice-chairman",
    name: "Divya Reddy",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "vc4",
    positionId: "vice-chairman",
    name: "Manav Joshi",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "vc5",
    positionId: "vice-chairman",
    name: "Pooja Iyer",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "vc6",
    positionId: "vice-chairman",
    name: "Aditya Bose",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  // Secretary
  {
    id: "s1",
    positionId: "secretary",
    name: "Meera Pillai",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "s2",
    positionId: "secretary",
    name: "Kunal Shah",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "s3",
    positionId: "secretary",
    name: "Tara Menon",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "s4",
    positionId: "secretary",
    name: "Aarav Kapoor",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "s5",
    positionId: "secretary",
    name: "Shreya Mishra",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "s6",
    positionId: "secretary",
    name: "Nikhil Rawat",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  // Treasurer
  {
    id: "t1",
    positionId: "treasurer",
    name: "Riya Bansal",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "t2",
    positionId: "treasurer",
    name: "Siddharth Rao",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "t3",
    positionId: "treasurer",
    name: "Neha Tiwari",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "t4",
    positionId: "treasurer",
    name: "Aryan Choudhary",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "t5",
    positionId: "treasurer",
    name: "Sanya Khanna",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "t6",
    positionId: "treasurer",
    name: "Dev Agarwal",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  // Sports Head
  {
    id: "sp1",
    positionId: "sports-head",
    name: "Kabir Malhotra",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "sp2",
    positionId: "sports-head",
    name: "Nisha Varma",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "sp3",
    positionId: "sports-head",
    name: "Samar Walia",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "sp4",
    positionId: "sports-head",
    name: "Leena Das",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "sp5",
    positionId: "sports-head",
    name: "Aman Trivedi",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "sp6",
    positionId: "sports-head",
    name: "Zara Sheikh",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  // Cultural Head
  {
    id: "cu1",
    positionId: "cultural-head",
    name: "Pallavi Sen",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cu2",
    positionId: "cultural-head",
    name: "Karthik Nambiar",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cu3",
    positionId: "cultural-head",
    name: "Ritu Bhatt",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "cu4",
    positionId: "cultural-head",
    name: "Jay Kothari",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cu5",
    positionId: "cultural-head",
    name: "Aisha Farouk",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "cu6",
    positionId: "cultural-head",
    name: "Mihir Doshi",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cu7",
    positionId: "cultural-head",
    name: "Chandni Mehta",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  // Technical Lead
  {
    id: "tl1",
    positionId: "technical-lead",
    name: "Yash Saxena",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "tl2",
    positionId: "technical-lead",
    name: "Preethi Rajan",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "tl3",
    positionId: "technical-lead",
    name: "Roshan Pillai",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "tl4",
    positionId: "technical-lead",
    name: "Faisal Ahmed",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "tl5",
    positionId: "technical-lead",
    name: "Shreya Kaul",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "tl6",
    positionId: "technical-lead",
    name: "Tanmay Borkar",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  // Class Representative
  {
    id: "cr1",
    positionId: "class-representative",
    name: "Simran Khosla",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cr2",
    positionId: "class-representative",
    name: "Param Gill",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "cr3",
    positionId: "class-representative",
    name: "Amrita Negi",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cr4",
    positionId: "class-representative",
    name: "Dhruv Sharma",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
  {
    id: "cr5",
    positionId: "class-representative",
    name: "Nikita Jain",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo2.jpg",
  },
  {
    id: "cr6",
    positionId: "class-representative",
    name: "Rishabh Mathur",
    description: "3rd Year Computer Science 24BSC00",
    imageUrl: "/logo.png",
  },
];

export const getCandidatesForPosition = (positionId: string): Candidate[] =>
  CANDIDATES.filter((c) => c.positionId === positionId);
