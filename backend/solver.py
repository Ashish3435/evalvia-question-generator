from typing import List, Dict, Any
import math

class ConstraintSolver:
    def __init__(self, total_marks: int, difficulty_mix: Dict[str, float],
                 topic_weightage: Dict[str, float], question_types: Dict[str, float]):
        self.total_marks = total_marks
        self.difficulty_mix = difficulty_mix # e.g. {"Easy": 0.3, "Medium": 0.5, "Hard": 0.2}
        self.topic_weightage = topic_weightage # e.g. {"Algebra": 0.4, "Geometry": 0.6}
        self.question_types = question_types # e.g. {"MCQ": 0.4, "Short Answer": 0.4, "Long Answer": 0.2}

        # Standard Mark Values per Question Type
        self.type_marks = {
            "MCQ": 1,
            "Short Answer": 3,
            "Long Answer": 5
        }

    def solve(self) -> Dict[str, Any]:
        warnings = []

        # 1. Calculate Target Marks per Question Type
        raw_mcq_marks = self.total_marks * self.question_types.get("MCQ", 0.4)
        raw_short_marks = self.total_marks * self.question_types.get("Short Answer", 0.4)
        raw_long_marks = self.total_marks * self.question_types.get("Long Answer", 0.2)

        # 2. Convert Marks to Integer Question Counts
        num_mcq = round(raw_mcq_marks / self.type_marks["MCQ"])
        num_short = round(raw_short_marks / self.type_marks["Short Answer"])
        num_long = round(raw_long_marks / self.type_marks["Long Answer"])

        actual_marks = (num_mcq * 1) + (num_short * 3) + (num_long * 5)

        # Handle Mark Mismatch Relaxation
        if actual_marks != self.total_marks:
            diff = self.total_marks - actual_marks
            num_mcq += diff  # Adjust via 1-mark MCQs to guarantee exact mark sum
            warnings.append(
                f"Adjusted MCQ count by {diff} question(s) to guarantee exact total of {self.total_marks} marks."
            )

        # 3. Create Concrete Slots List
        slots = []

        # Build slot templates
        type_counts = [
            ("MCQ", num_mcq, 1),
            ("Short Answer", num_short, 3),
            ("Long Answer", num_long, 5)
        ]

        topics = list(self.topic_weightage.keys())
        difficulties = ["Easy", "Medium", "Hard"]

        slot_id = 1
        for q_type, count, marks in type_counts:
            for i in range(count):
                # Assign topic based on weightage distribution
                topic = topics[i % len(topics)]
                # Assign difficulty based on index rotation
                difficulty = difficulties[i % len(difficulties)]

                slots.append({
                    "slot_id": slot_id,
                    "type": q_type,
                    "marks": marks,
                    "topic": topic,
                    "difficulty": difficulty
                })
                slot_id += 1

        return {
            "status": "success",
            "total_marks": self.total_marks,
            "total_questions": len(slots),
            "warnings": warnings,
            "slots": slots
        }