// PREVIEW COPY of the campus places, used only until the app reads them from the server (Stage 8).
// Generated from backend/src/config/campusLocations.js; tests/sampleData.test.js fails if the two differ.
// This file is deleted in Stage 8, when GET /meta/options supplies the list.

export const previewZones = Object.freeze([
  {
    "code": "LIBRARY",
    "label": "Library",
    "detail": {
      "mode": "REQUIRED_TEXT",
      "hint": "Which library, and which floor or section?"
    }
  },
  {
    "code": "CLASSROOM",
    "label": "Lecture buildings and classrooms",
    "detail": {
      "mode": "REQUIRED_TEXT",
      "hint": "Which building and class number? For example: BBS Class 102"
    }
  },
  {
    "code": "AUDITORIUM",
    "label": "Auditoriums, lecture theatres and halls",
    "detail": {
      "mode": "LIST",
      "hint": "Which one?",
      "options": [
        "Amphitheatre",
        "Ameyoh Auditorium",
        "BBS Auditorium A",
        "BBS Auditorium B",
        "BBS Auditorium C",
        "Bethel Hall Auditorium",
        "Chiemela Ikonne LTA",
        "Crystal Hall Auditorium",
        "Diamond Hall",
        "FAD Hall Auditorium",
        "Law Activity Hall (Iperu campus)",
        "Nelson Mandela Auditorium",
        "Ogden Hall Auditorium",
        "Platinum Hall Auditorium",
        "Queen Esther Auditorium",
        "Samuel Akande Auditorium",
        "Sapphire Activity Hall",
        "Silvanus Chioma LTA",
        "White Hall Auditorium",
        "Youth Center",
        "Not sure which"
      ]
    }
  },
  {
    "code": "MALE_HALLS",
    "label": "Halls of residence (male)",
    "detail": {
      "mode": "LIST",
      "hint": "Which hall?",
      "options": [
        "Bethel Splendor",
        "Emerald Hall",
        "Gamaliel Classic Hall (Iperu campus)",
        "Gamaliel Hall",
        "Gideon Troopers",
        "Neal Wilson",
        "Nelson Mandela",
        "Samuel Akande",
        "Topaz Hall",
        "Welch",
        "Winslow",
        "Not sure which"
      ]
    }
  },
  {
    "code": "FEMALE_HALLS",
    "label": "Halls of residence (female)",
    "detail": {
      "mode": "LIST",
      "hint": "Which hall?",
      "options": [
        "Ameyo Adadevoh",
        "Crystal",
        "Felicia Adebisi Dada",
        "Havilah Gold",
        "Iperu Female Hall",
        "Justice Deborah",
        "Nyberg",
        "Ogden",
        "Platinum",
        "Queen Esther",
        "White",
        "Not sure which"
      ]
    }
  },
  {
    "code": "CHURCH",
    "label": "Church or chapel",
    "detail": {
      "mode": "LIST",
      "hint": "Which church or chapel?",
      "options": [
        "Bethel Chapel",
        "Beula Chapel",
        "Canaan Land Chapel",
        "Christ Our Foundation Church",
        "Christ Our Shepherd Chapel",
        "Covenant Chapel",
        "Dominion Chapel",
        "Ebenezer Chapel",
        "Glory Land Chapel",
        "Grace Chapel",
        "Heir of the Kingdom Chapel",
        "Heritage Church",
        "Light House Chapel",
        "Living Springs",
        "Maranatha Chapel",
        "Millennium Chapel",
        "Mount Zion",
        "New Creation Chapel",
        "New Life Chapel",
        "Pioneer Church",
        "Praise Chapel",
        "Prince Emmanuel Chapel",
        "Redemption Chapel",
        "Shekainah Glory",
        "Siloam Valley Church",
        "Solid Rock Chapel",
        "Testimony Chapel",
        "Victory Land Chapel",
        "Youth Church",
        "Not sure which"
      ]
    }
  },
  {
    "code": "CAFETERIA",
    "label": "Cafeteria and food areas",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which cafeteria? For example: Old Cafeteria"
    }
  },
  {
    "code": "SPORTS",
    "label": "Sports facilities, field and gym",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which facility?"
    }
  },
  {
    "code": "HOSPITAL",
    "label": "Hospital or health centre",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which part? For example: BUTH 600 Seater"
    }
  },
  {
    "code": "ADMIN",
    "label": "Administration buildings and offices",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which office or building?"
    }
  },
  {
    "code": "SHOPS",
    "label": "Shops, bookshop and market area",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which shop or area?"
    }
  },
  {
    "code": "GATES",
    "label": "Gates, roads and parking",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which gate, road or car park?"
    }
  },
  {
    "code": "IPERU",
    "label": "Iperu-Remo campus (other places)",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which place?"
    }
  },
  {
    "code": "OFF_CAMPUS",
    "label": "Off campus",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Which area or street?"
    }
  },
  {
    "code": "NOT_SURE",
    "label": "Not sure, or somewhere else",
    "detail": {
      "mode": "OPTIONAL_TEXT",
      "hint": "Anything that might help (optional)"
    }
  }
]);
