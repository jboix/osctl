// The state machine driving the /profile add wizard steps.

/** The answers the wizard collects. */
export interface ProfileAnswers {
  /** Profile name. */
  name: string;
  /** Cluster URL. */
  host: string;
  /** Basic auth username, omitted when the cluster has no auth. */
  username?: string;
  /** Basic auth password, omitted when the cluster has no auth. */
  password?: string;
  /** Whether to verify TLS certificates. */
  tlsVerify: boolean;
}

type Step = 'name' | 'host' | 'auth' | 'username' | 'password' | 'tls';

/** One wizard question: how to render it, how to apply it, where to go next. */
export interface Question {
  /** The input kind. */
  kind: 'text' | 'select';
  /** The question label. */
  label: string;
  /** The value an empty text input falls back to. */
  fallback?: string;
  /** Whether the text input is masked. */
  mask?: boolean;
  /** The selectable items of a select question. */
  items?: { label: string; value: boolean }[];
  /**
   * The step that follows, or a function of the value when it branches.
   * Undefined means the wizard is complete after this question.
   */
  next?: Step | ((value: string | boolean) => Step);
  /**
   * Merges the answer into the collected answers. The default stores the
   * value as a string under the step id.
   */
  apply?: (
    answers: Partial<ProfileAnswers>,
    value: string | boolean,
  ) => Partial<ProfileAnswers>;
}

const QUESTIONS: Record<Step, Question> = {
  name: {
    kind: 'text',
    label: 'Profile name',
    fallback: 'default',
    next: 'host',
  },
  host: {
    kind: 'text',
    label: 'Host',
    fallback: 'http://localhost:9200',
    next: 'auth',
  },
  auth: {
    kind: 'select',
    label: 'Authentication',
    items: [
      { label: 'none', value: false },
      { label: 'basic', value: true },
    ],
    next: (value) => (value === true ? 'username' : 'tls'),
    apply: (answers) => answers,
  },
  username: { kind: 'text', label: 'Username', next: 'password' },
  password: { kind: 'text', label: 'Password', mask: true, next: 'tls' },
  tls: {
    kind: 'select',
    label: 'Verify TLS certificates?',
    items: [
      { label: 'yes', value: true },
      { label: 'no', value: false },
    ],
    apply: (answers, value) => ({ ...answers, tlsVerify: value === true }),
  },
};

/** Executes the wizard questions: holds the answers and the current step. */
export class ProfileAddMachine {
  /** The current step. */
  readonly step: Step;
  /** The answers collected so far. */
  private readonly answers: Partial<ProfileAnswers>;
  /** The completed answers, set when the wizard is done. */
  readonly result?: ProfileAnswers;

  /**
   * Creates a machine state.
   *
   * @param step - The current step.
   * @param answers - The answers collected so far.
   * @param result - The completed answers when the wizard is done.
   */
  private constructor(
    step: Step,
    answers: Partial<ProfileAnswers>,
    result?: ProfileAnswers,
  ) {
    this.step = step;
    this.answers = answers;
    this.result = result;
  }

  /**
   * Starts the wizard, resuming at the host step after a failed attempt.
   *
   * @param initial - The answers of the failed attempt.
   * @returns The starting machine state.
   */
  static start(initial?: ProfileAnswers): ProfileAddMachine {
    return initial === undefined
      ? new ProfileAddMachine('name', {})
      : new ProfileAddMachine('host', initial);
  }

  /**
   * Returns the question of the current step.
   *
   * @returns The question. A text question whose field already has an answer
   * uses that answer as fallback, so enter keeps it.
   */
  get question(): Question {
    const question = QUESTIONS[this.step];
    const previous = this.answers[this.step as keyof ProfileAnswers];
    if (question.kind === 'text' && typeof previous === 'string') {
      return { ...question, fallback: previous };
    }
    return question;
  }

  /**
   * Applies the answer of the current step.
   *
   * @param value - The text answer or the selected value.
   * @returns The next machine state, carrying the result when complete.
   */
  answer(value: string | boolean): ProfileAddMachine {
    const question = QUESTIONS[this.step];
    const answers =
      question.apply === undefined
        ? { ...this.answers, [this.step]: String(value) }
        : question.apply(this.answers, value);
    const next =
      typeof question.next === 'function'
        ? question.next(value)
        : question.next;
    if (next === undefined) {
      return new ProfileAddMachine(
        this.step,
        answers,
        answers as ProfileAnswers,
      );
    }
    return new ProfileAddMachine(next, answers);
  }
}
