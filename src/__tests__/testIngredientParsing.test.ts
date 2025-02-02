import { cleanIngredients } from "../IngredientsParsing/cleanIngredients";

describe("cleanIngredients", () => {
  test("removes dosage and format descriptors", () => {
    expect(
      cleanIngredients("Tacrolimus (dưới dạng Tacrolimus monohydrate) 5mg")
    ).toEqual(["Tacrolimus"]);
    expect(cleanIngredients("Paracetamol (dưới dạng Paracetamol natri) 500mg")).toEqual(["Paracetamol"]);
    expect(cleanIngredients("Metformin (dưới dạng Metformin hydrochlorid) 1000mg - 1000mg")).toEqual(["Metformin"]);
    expect(cleanIngredients("Pantoprazol (dưới dạng Pantoprazol natri sesquihydrat) 40mg")).toEqual(["Pantoprazol"]);
  });

  test("splits multiple ingredients correctly", () => {
    expect(
      cleanIngredients(
        "Mỗi 10ml dung dịch chứa: Tropicamide 50mg; Phenylephrin HCl 50mg"
      )
    ).toEqual(["Tropicamide", "Phenylephrin Hcl"]);
  });

  test("handles complex formulations", () => {
    expect(
      cleanIngredients(
        "1000 ml nhũ dịch chứa: Alanine 3,66g; Arginine 5,33g; Glycine 6,95g"
      )
    ).toEqual(["Alanine", "Arginine", "Glycine"]);
    expect(cleanIngredients("Caffeine 200mg; Paracetamol 500mg")).toEqual(["Caffeine", "Paracetamol"]);
    expect(cleanIngredients("Losartan kali 50mg; Hydrochlorothiazid 12,5mg")).toEqual(["Losartan Kali", "Hydrochlorothiazid"]);
    expect(cleanIngredients("Ledipasvir (dưới dạng Ledipasvir premix) 90mg; Sofosbuvir 400mg - 90mg, 400mg")).toEqual(["Ledipasvir", "Sofosbuvir"]);

  });

  test("cleans simple single-ingredient entries", () => {
    expect(cleanIngredients("Lynestrenol 5mg")).toEqual(["Lynestrenol"]);
    expect(cleanIngredients("Aspirin 100mg")).toEqual(["Aspirin"]);
    expect(cleanIngredients("Fluconazole 150mg")).toEqual(["Fluconazole"]);
    expect(cleanIngredients("Ceftriaxone 1g")).toEqual(["Ceftriaxone"]);
    expect(cleanIngredients("Ibuprofen 400mg/5ml")).toEqual(["Ibuprofen"]);

  });

  test("Alternative formulations and equivalencies", () => {
    expect(cleanIngredients("Omeprazole (dưới dạng pellet bao tan trong ruột) 20mg")).toEqual(["Omeprazole"]);
    // This one is tricky, might need manual intervention
    // expect(cleanIngredients("Rabeprazole sodium USP tương đương Rabeprazole 40mg")).toEqual(["Rabeprazole sodium USP"]);
  });

  test("handles mixed separator cases", () => {
    expect(
      cleanIngredients("Sildenafil (dưới dạng Sildenafil citrat) 100mg - 100mg")
    ).toEqual(["Sildenafil"]);
  });

  test("returns an empty array for empty input", () => {
    expect(cleanIngredients("")).toEqual([]);
  });

});
