const syllabusSubjects = [
  {
    semester: 'Semester 1',
    subjects: [
      { code: 'ESC101', name: 'Engineering Mathematics-I', kind: 'units', items: ['Single Variable Calculus', 'Multivariable Calculus - Partial Differentiation', 'Applications of Partial Differentiation', 'Linear Algebra - Matrices and Systems of Linear Equations', 'Eigenvalues, Eigenvectors and Diagonalization'] },
      { code: 'ESC102', name: 'Engineering Physics', kind: 'units', items: ['Fundamentals of Photonics', 'Quantum Physics', 'Wave Optics', 'Semiconductor Physics and Ultrasonics', 'Physics of Nanoparticles and Superconductivity'] },
      { code: 'ESC103', name: 'Engineering Chemistry', kind: 'units', items: ['Water Technology', 'Instrumental Methods of Analysis', 'Advanced Engineering Materials', 'Energy Sources', 'Corrosion and its Prevention'] },
      { code: 'ELE105', name: 'Basic Electrical Engineering', kind: 'units', items: ['Elementary Concepts and DC Circuits', 'Electromagnetism', 'AC Fundamentals', 'AC Circuits', 'Introduction to Electric Machines'] },
      { code: 'ETC104', name: 'Basic Electronics Engineering', kind: 'units', items: ['Diodes and Applications', 'Transistors and Technology', 'Logic Gates and Digital Circuits', 'Operational Amplifiers and Electronic Instruments', 'Sensors and Communication Systems'] },
      { code: 'MEC106', name: 'Engineering Graphics', kind: 'units', items: ['Engineering Drawing Fundamentals; Projection of Points and Lines', 'Projection of Planes', 'Engineering Curves and Development of Lateral Surfaces', 'Orthographic Projection', 'Isometric Projection'] },
      { code: 'COM108', name: 'Fundamentals of Programming Languages', kind: 'units', items: ['Program Planning and Introduction to C', 'Operators and Expressions', 'Control Flow', 'Arrays', 'User-Defined Functions and Structures'] },
      { code: 'AEC111', name: 'Professional Communication Skills', kind: 'units', items: ['Introduction to the Language Lab', 'Active Listening Skills', 'Speaking', 'Reading and Writing Skills', 'Workplace Communication'] }
    ]
  },
  {
    semester: 'Semester 2',
    subjects: [
      { code: 'ESC113', name: 'Engineering Mathematics-II', kind: 'units', items: ['Integral Calculus', 'Curve Tracing and Solid Geometry', 'Multiple Integrals and Applications', 'First-Order Ordinary Differential Equations', 'Applications of Differential Equations'] },
      { code: 'CVL107', name: 'Engineering Mechanics', kind: 'units', items: ['Force Systems and Resultants', 'Equilibrium', 'Friction and Trusses', 'Kinematics of a Particle', 'Kinetics of a Particle'] },
      { code: 'ITT114', name: 'Programming and Problem Solving', kind: 'units', items: ['Problem Solving, Programming and Python', 'Advanced Data Types and Decision Control', 'Functions and Strings', 'File Handling and Dictionaries', 'Object-Oriented Programming'] },
      { code: 'VSE109', name: 'Manufacturing Practice Workshop', kind: 'practical outline', items: ['Workshop layout and equipment', 'Workshop hazards, safety rules and protective devices', 'Mechanical component making: cutting, shearing, bending, welding, riveting, filing or drilling', 'Demonstration of an advanced machine tool', 'Programming a manufacturing sequence', 'CAD modelling and 3D printing'] },
      { code: 'VSE101', name: 'Design Thinking & Idea Lab', kind: 'practical outline', items: ['Introduction to design thinking, empathy mapping and user interviews', 'Ideation and creativity', 'Prototyping and user testing', 'Analysis and evaluation with the Six Thinking Hats', 'Communication, collaboration and project presentation'] },
      { code: 'IKS115', name: 'Indian Knowledge System', kind: 'course outline', items: ['Foundations and historical context of Indian knowledge systems', 'Indian philosophy and its relevance', 'Scientific achievements, mathematics and astronomy', 'Ancient engineering, metallurgy, materials and architecture', 'Assignments, activities and case studies on Indian knowledge and engineering'] },
      { code: 'CCC116', name: 'Co-Curricular Courses', kind: 'course outline', items: ['Sports', 'NSS and NCC', 'Fine and applied arts', 'Performing arts', 'Self-defence and wellness', 'Jeevan Vidya and work-life balance', 'Innovation, leadership and mentoring'] }
    ]
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const host = document.getElementById('syllabusSubjects');
  const modal = document.getElementById('syllabusModal');
  if (!host || !modal) return;

  const title = document.getElementById('syllabusModalTitle');
  const meta = document.getElementById('syllabusModalMeta');
  const content = document.getElementById('syllabusModalContent');
  const closeButton = document.getElementById('closeSyllabus');
  let lastTrigger = null;

  host.innerHTML = syllabusSubjects.map((group, groupIndex) => `
    <section class="syllabus-semester" aria-labelledby="syllabusSemester${groupIndex}">
      <div class="syllabus-semester-heading"><h3 id="syllabusSemester${groupIndex}">${group.semester}</h3><span>${group.subjects.length} subjects</span></div>
      <div class="grid-auto syllabus-grid">${group.subjects.map((subject, subjectIndex) => `
        <article class="card syllabus-card">
          <div class="syllabus-code">${subject.code}</div>
          <h4>${subject.name}</h4>
          <button class="btn btn-secondary btn-sm" type="button" data-syllabus-group="${groupIndex}" data-syllabus-subject="${subjectIndex}">View syllabus <span aria-hidden="true">↗</span></button>
        </article>`).join('')}
      </div>
    </section>`).join('');

  function closeModal() {
    modal.classList.remove('show');
    if (lastTrigger) lastTrigger.focus();
  }

  host.addEventListener('click', (event) => {
    const button = event.target.closest('[data-syllabus-group]');
    if (!button) return;
    const subject = syllabusSubjects[Number(button.dataset.syllabusGroup)]?.subjects[Number(button.dataset.syllabusSubject)];
    if (!subject) return;

    lastTrigger = button;
    title.textContent = subject.name;
    meta.textContent = `${subject.code} · ${subject.kind}`;
    content.replaceChildren(...subject.items.map((item, index) => {
      const entry = document.createElement('article');
      entry.className = 'syllabus-unit';
      const label = document.createElement('span');
      label.textContent = subject.kind === 'units' ? `Unit ${['I', 'II', 'III', 'IV', 'V'][index]}` : `Topic ${String(index + 1).padStart(2, '0')}`;
      const heading = document.createElement('strong');
      heading.textContent = item;
      entry.append(label, heading);
      return entry;
    }));
    modal.classList.add('show');
    closeButton.focus();
  });

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });
});
